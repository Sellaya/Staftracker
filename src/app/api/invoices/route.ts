import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';

const invoicePath = path.join(process.cwd(), 'invoices.json');
const shiftPath = path.join(process.cwd(), 'shifts.json');

async function readDB(p: string) {
  try {
    const data = await fs.readFile(p, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeInvoices(data: any) {
  await fs.writeFile(invoicePath, JSON.stringify(data, null, 2));
}

export async function GET(request: Request) {
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
    const { clientId, clientName, shiftIds } = await request.json();
    const allShifts = await readDB(shiftPath);
    
    // Filter for shifts that are Approved and NOT already Invoiced
    const shiftsToBill = allShifts.filter((s: any) => 
      s.clientId === clientId && 
      s.isApproved === true && 
      s.isInvoiced !== true &&
      (shiftIds.length === 0 || shiftIds.includes(s.id))
    );
    
    if (shiftsToBill.length === 0) {
      return NextResponse.json({ error: "No approved unbilled shifts found for this client" }, { status: 400 });
    }

    const amount = shiftsToBill.reduce((acc: number, s: any) => acc + (s.hours * (s.rate || 25)), 0);
    
    const newInvoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
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
    await fs.writeFile(shiftPath, JSON.stringify(updatedShifts, null, 2));

    const invoices = await readDB(invoicePath);
    invoices.unshift(newInvoice);
    await writeInvoices(invoices);

    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('GENERATE_INVOICE', `Generated invoice ${newInvoice.id} for ${clientName} ($${amount})`, userEmail, userId);

    return NextResponse.json(newInvoice);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
