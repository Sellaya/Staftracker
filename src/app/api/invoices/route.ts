import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const invoicePath = path.join(process.cwd(), 'invoices.json');
const shiftPath = path.join(process.cwd(), 'shifts.json');

async function readDB(p: string) {
  return readJsonFile<any[]>(p, []);
}

async function writeInvoices(data: any) {
  await writeJsonFileAtomic(invoicePath, data);
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  
  const invoices = await readDB(invoicePath);
  if (clientId) {
    return NextResponse.json(invoices.filter((i: any) => i.clientId === clientId));
  }
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const { clientId, clientName, shiftIds } = await request.json();
    if (typeof clientId !== "string" || typeof clientName !== "string") {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }
    const selectedShiftIds = Array.isArray(shiftIds) ? shiftIds : [];
    const allShifts = await readDB(shiftPath);
    
    // Filter for shifts that are Approved and NOT already Invoiced
    const shiftsToBill = allShifts.filter((s: any) => 
      s.clientId === clientId && 
      s.isApproved === true && 
      s.isInvoiced !== true &&
      (selectedShiftIds.length === 0 || selectedShiftIds.includes(s.id))
    );
    
    if (shiftsToBill.length === 0) {
      return NextResponse.json({ error: "No approved unbilled shifts found for this client" }, { status: 400 });
    }

    const amount = shiftsToBill.reduce((acc: number, s: any) => acc + (s.hours * (s.rate || 25)), 0);
    
    const newInvoice = {
      id: generateId('INV'),
      clientId,
      clientName,
      amount,
      status: "Pending",
      createdAt: new Date().toISOString(),
      shiftCount: shiftsToBill.length,
      shiftIds: shiftsToBill.map((s: any) => s.id),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Mark shifts as Invoiced and store the invoice ID
    const updatedShifts = allShifts.map((s: any) => 
      shiftsToBill.some((ts: any) => ts.id === s.id) ? { ...s, isInvoiced: true, invoiceId: newInvoice.id } : s
    );
    await withFileLock(shiftPath, async () => {
      await writeJsonFileAtomic(shiftPath, updatedShifts);
    });

    await withFileLock(invoicePath, async () => {
      const invoices = await readDB(invoicePath);
      invoices.unshift(newInvoice);
      await writeInvoices(invoices);
    });

    await recordLog('GENERATE_INVOICE', `Generated invoice ${newInvoice.id} for ${clientName} ($${amount})`, actor.email, actor.id);

    return NextResponse.json(newInvoice);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
