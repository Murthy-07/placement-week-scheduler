import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DoorClosed,
  Hammer,
  ShieldAlert,
  Sliders,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Room } from '../types';

export const RoomsView: React.FC = () => {
  const { dataset, interviews, selectedDayId, applyRoomUnavailable, setActiveTab } = useScheduler();
  const { rooms, timeslots } = dataset;

  // Occupancy per room across all slots
  const roomOccupancyMap = useMemo(() => {
    const map = new Map<number, { total: number; today: number }>();
    for (const r of rooms) {
      map.set(r.id, { total: 0, today: 0 });
    }

    for (const item of interviews) {
      if (item.status !== 'CANCELLED') {
        const cur = map.get(item.roomId);
        if (cur) {
          cur.total += 1;
          if (item.dayId === selectedDayId) {
            cur.today += 1;
          }
        }
      }
    }
    return map;
  }, [rooms, interviews, selectedDayId]);

  const handleMaintenanceToggle = (room: Room) => {
    applyRoomUnavailable({
      roomId: room.id,
      dayId: selectedDayId,
      reason: `Emergency air conditioning failure & electrical maintenance in ${room.roomNumber}`,
    });
    setActiveTab('disruptions');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <DoorClosed className="w-5 h-5 text-indigo-600" />
            <span>Interview Rooms & Physical Capacity ({rooms.length} Rooms)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical room allocations across Academic Blocks ({rooms.map(r => r.roomNumber).slice(0, 3).join(', ')}... to {rooms[rooms.length - 1]?.roomNumber}). Total physical capacity: {(rooms.length * timeslots.length).toLocaleString()} slot-hours.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-3 text-xs bg-indigo-50 text-indigo-900 px-3 py-2 rounded-lg border border-indigo-100 font-medium">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>All {rooms.length} Rooms Active</span>
          </div>

          <button
            id="btn-goto-room-mgmt"
            onClick={() => setActiveTab('data-mgmt')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Venues</span>
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {rooms.map(room => {
          const occ = roomOccupancyMap.get(room.id) || { total: 0, today: 0 };
          const daySlotsCount = timeslots.filter(t => t.dayId === selectedDayId).length || 16;
          const totalUtilPct = Math.round((occ.total / (timeslots.length || 1)) * 100);
          const todayUtilPct = Math.round((occ.today / (daySlotsCount || 1)) * 100);

          return (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                      <DoorClosed className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Room {room.roomNumber}</h3>
                      <span className="text-[11px] text-slate-400">{room.building}</span>
                    </div>
                  </div>
                </div>

                {/* Util Stats */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Today (Day {selectedDayId})</span>
                    <strong className="text-slate-900 font-bold">{occ.today} / 16 slots</strong>
                    <span className="text-[10px] text-slate-400 block">({todayUtilPct}% full)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Weekly Total</span>
                    <strong className="text-slate-900 font-bold">{occ.total} / 80 slots</strong>
                    <span className="text-[10px] text-slate-400 block">({totalUtilPct}% full)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, totalUtilPct)}%` }}
                  />
                </div>
              </div>

              {/* Maintenance trigger button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleMaintenanceToggle(room)}
                  className="w-full py-1.5 px-2 bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 hover:border-red-200 transition flex items-center justify-center space-x-1.5"
                  title="Simulate room failure and test automatic room relocation"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Simulate Room Outage</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
