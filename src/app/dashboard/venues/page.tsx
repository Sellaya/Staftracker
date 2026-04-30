"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Search, Filter, MapPin, Settings, X, 
  Map, Users, Info, PowerOff, Edit3, Car, Navigation
} from "lucide-react";

// Types
type Department = { name: string, active: boolean };

type Venue = {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  address: string;
  gps: string;
  status: "Active" | "Deactivated";
  departments: Department[];
  instructions: string;
  dressCode: string;
  parkingInfo: string;
};

// Mock Data
const INITIAL_VENUES: Venue[] = [];

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>(INITIAL_VENUES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All"); 
  
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  
  // Edit Modes
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempInstructions, setTempInstructions] = useState("");
  const [tempDressCode, setTempDressCode] = useState("");
  const [tempParking, setTempParking] = useState("");

  // Derived State
  const filteredVenues = useMemo(() => {
    return venues.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            v.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            v.address.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "All") return true;
      if (filter === "Active") return v.status === "Active";
      if (filter === "Deactivated") return v.status === "Deactivated";
      
      return true;
    });
  }, [venues, searchQuery, filter]);

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  // Actions
  const toggleDeactivate = (id: string) => {
    setVenues(venues.map(v => v.id === id ? { ...v, status: v.status === "Active" ? "Deactivated" : "Active" } : v));
  };

  const toggleDepartment = (venueId: string, deptName: string) => {
    setVenues(venues.map(v => {
      if (v.id === venueId) {
        return {
          ...v,
          departments: v.departments.map(d => d.name === deptName ? { ...d, active: !d.active } : d)
        };
      }
      return v;
    }));
  };

  const startEditingNotes = () => {
    if (!selectedVenue) return;
    setTempInstructions(selectedVenue.instructions);
    setTempDressCode(selectedVenue.dressCode);
    setTempParking(selectedVenue.parkingInfo);
    setEditingNotes(true);
  };

  const saveNotes = () => {
    if (!selectedVenue) return;
    setVenues(venues.map(v => {
      if (v.id === selectedVenue.id) {
        return {
          ...v,
          instructions: tempInstructions,
          dressCode: tempDressCode,
          parkingInfo: tempParking
        };
      }
      return v;
    }));
    setEditingNotes(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Management</h1>
          <p className="text-foreground/70 mt-1">Manage physical locations, instructions, and department availability.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
          + Add New Venue
        </button>
      </div>

      <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden">
        <div className="p-4 border-b border-secondary/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venues, addresses, or clients..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {["All", "Active", "Deactivated"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "border border-secondary hover:bg-secondary/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-foreground/70 border-b border-secondary/50">
              <tr>
                <th className="px-6 py-4 font-medium">Venue Details</th>
                <th className="px-6 py-4 font-medium">Associated Client</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map((venue, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={venue.id} 
                  onClick={() => setSelectedVenueId(venue.id)}
                  className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">{venue.name}</p>
                        <p className="text-xs text-foreground/50">{venue.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground/80">{venue.clientName}</p>
                    <p className="text-xs text-foreground/40 font-mono">{venue.clientId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm w-48 truncate" title={venue.address}>{venue.address}</p>
                    <p className="text-xs text-foreground/50 font-mono mt-0.5">{venue.gps}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      venue.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {venue.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary text-xs font-bold hover:underline">Manage</button>
                  </td>
                </motion.tr>
              ))}
              {filteredVenues.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    No venues found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Overlay for Venue Profile */}
      <AnimatePresence>
        {selectedVenue && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedVenueId(null); setEditingNotes(false); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-secondary shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-secondary flex justify-between items-start bg-secondary/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {selectedVenue.name}
                    </h2>
                    <p className="text-foreground/50 text-sm mt-1">{selectedVenue.clientName} • {selectedVenue.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleDeactivate(selectedVenue.id)}
                    className={`p-2 rounded-lg border transition-colors ${
                      selectedVenue.status === "Active" ? "border-red-500/30 text-red-500 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                    }`}
                    title={selectedVenue.status === "Active" ? "Deactivate Venue" : "Reactivate Venue"}
                  >
                    <PowerOff className="w-5 h-5" />
                  </button>
                  <button onClick={() => { setSelectedVenueId(null); setEditingNotes(false); }} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Location Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-secondary pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Map className="w-5 h-5 text-primary" /> Location Configuration
                    </h3>
                    <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      Edit <Edit3 className="w-3 h-3"/>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary/10 border border-secondary/50 rounded-xl">
                      <p className="text-xs font-bold text-foreground/50 mb-1">STREET ADDRESS</p>
                      <p className="text-sm font-medium">{selectedVenue.address}</p>
                    </div>
                    <div className="p-4 bg-secondary/10 border border-secondary/50 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-foreground/50 mb-1">GPS COORDINATES</p>
                        <p className="text-sm font-mono">{selectedVenue.gps}</p>
                      </div>
                      <Navigation className="w-5 h-5 text-primary opacity-50" />
                    </div>
                  </div>
                </div>

                {/* Departments */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 border-b border-secondary pb-2">
                    <Users className="w-5 h-5 text-primary" /> Department Availability
                  </h3>
                  <p className="text-sm text-foreground/70 mb-4">Toggle which departments can have shifts posted at this venue.</p>
                  
                  <div className="flex flex-wrap gap-3">
                    {selectedVenue.departments.map(dept => (
                      <button 
                        key={dept.name}
                        onClick={() => toggleDepartment(selectedVenue.id, dept.name)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                          dept.active ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-secondary text-foreground/50 hover:bg-secondary/50"
                        }`}
                      >
                        {dept.name} {dept.active && "✓"}
                      </button>
                    ))}
                    <button className="px-4 py-2 rounded-lg text-sm font-bold border border-dashed border-secondary text-foreground/50 hover:bg-secondary/30 transition-all">
                      + Add Dept
                    </button>
                  </div>
                </div>

                {/* Specific Instructions & Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-secondary pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Info className="w-5 h-5 text-primary" /> Worker Instructions
                    </h3>
                    {!editingNotes && (
                      <button onClick={startEditingNotes} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        Edit Notes <Edit3 className="w-3 h-3"/>
                      </button>
                    )}
                  </div>

                  {editingNotes ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">ARRIVAL INSTRUCTIONS</label>
                        <textarea 
                          value={tempInstructions}
                          onChange={e => setTempInstructions(e.target.value)}
                          className="w-full h-20 p-3 bg-background border border-primary rounded-xl text-sm focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">DRESS CODE</label>
                        <textarea 
                          value={tempDressCode}
                          onChange={e => setTempDressCode(e.target.value)}
                          className="w-full h-20 p-3 bg-background border border-primary rounded-xl text-sm focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">PARKING INFO</label>
                        <textarea 
                          value={tempParking}
                          onChange={e => setTempParking(e.target.value)}
                          className="w-full h-20 p-3 bg-background border border-primary rounded-xl text-sm focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex gap-3 justify-end pt-2">
                        <button onClick={() => setEditingNotes(false)} className="px-4 py-2 border border-secondary rounded-lg text-sm font-bold hover:bg-secondary/50">Cancel</button>
                        <button onClick={saveNotes} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">Save Instructions</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/50">
                        <p className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3"/> ARRIVAL INSTRUCTIONS
                        </p>
                        <p className="text-sm">{selectedVenue.instructions || "None specified."}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/50">
                          <p className="text-xs font-bold text-foreground/50 mb-2">DRESS CODE</p>
                          <p className="text-sm">{selectedVenue.dressCode || "None specified."}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/50">
                          <p className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-1">
                            <Car className="w-3 h-3"/> PARKING INFO
                          </p>
                          <p className="text-sm">{selectedVenue.parkingInfo || "None specified."}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
