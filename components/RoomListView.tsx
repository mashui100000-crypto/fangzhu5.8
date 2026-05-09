
import React from 'react';
import { 
  X, CheckSquare, Search, BookOpen, History, 
  Building2, RotateCcw, FileText, Square, CheckCircle, Plus,
  ListChecks, Copy, Download, Cloud, AlertCircle, Check, Settings2
} from 'lucide-react';
import { Room, AppConfig, ActionHandlers, ModalState } from '../types';
import { getBuildingName } from '../utils';

interface RoomListViewProps {
  rooms: Room[];
  search: {
    input: string;
    setInput: (v: string) => void;
    active: string;
    run: () => void;
    clear: () => void;
  };
  filter: {
    building: string;
    setBuilding: (v: string) => void;
    date: string;
    setDate: (v: string) => void;
  };
  batch: {
    isMode: boolean;
    setMode: (v: boolean) => void;
    ids: Set<string>;
    setIds: (v: Set<string>) => void;
  };
  actions: ActionHandlers;
  openGuide: () => void;
  navigate: (view: 'list' | 'edit' | 'add', id?: string) => void;
  setModal: React.Dispatch<React.SetStateAction<ModalState>>;
  confirmAction: (title: string, content: string, action: () => void) => void;
  config: AppConfig;
  cloudUser: any;
}

export const RoomListView: React.FC<RoomListViewProps> = ({ 
  rooms, search, filter, batch, actions, navigate, 
  setModal, openGuide, confirmAction, config,
  cloudUser
}) => {
  const getVal = (v: any) => parseFloat(v) || 0;

  const calcDetails = (r: Room) => {
    const ep = r.fixedElecPrice || '0';
    const wp = r.fixedWaterPrice || '0';
    const e = (getVal(r.elecCurr) - getVal(r.elecPrev)) * getVal(ep);
    const w = (getVal(r.waterCurr) - getVal(r.waterPrev)) * getVal(wp);
    const extra = (r.extraFees || []).reduce((sum, item) => sum + getVal(item.amount), 0);
    const rent = getVal(r.rent);
    return {
        rent,
        elec: Math.max(0, e),
        water: Math.max(0, w),
        total: Math.max(0, rent + Math.max(0, e) + Math.max(0, w) + extra)
    };
  };

  const allBuildings = ['all', ...new Set(rooms.map(r => getBuildingName(r.roomNo)))].sort();
  
  let filtered = rooms;
  if (search.active) filtered = filtered.filter(r => r.roomNo.toLowerCase().includes(search.active.toLowerCase()));
  if (filter.building !== 'all') filtered = filtered.filter(r => getBuildingName(r.roomNo) === filter.building);
  if (filter.date !== 'all') filtered = filtered.filter(r => (r.payDay || 1) === parseInt(filter.date));
  
  const allPayDays = [...new Set(rooms.map(r => r.payDay || 1))].sort((a, b) => Number(a) - Number(b));
  
  // Grouping Logic
  interface RoomGroup {
    label?: string;
    rooms: Room[];
  }
  
  const sortRooms = (list: Room[]) => list.sort((a, b) => { 
      if (a.status !== b.status) return a.status === 'unpaid' ? -1 : 1; 
      return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }); 
  });

  let displayGroups: RoomGroup[] = [];
  if (filter.date === 'all') {
      displayGroups = [{ rooms: sortRooms([...filtered]) }];
  } else {
      if (filtered.length > 0) {
        displayGroups = [{
            label: `${filter.date}号收租 (共${filtered.length}户)`,
            rooms: sortRooms([...filtered])
        }];
      }
  }

  // Statistics Calculation
  const stats = filtered.reduce((acc, r) => {
      const d = calcDetails(r);
      acc.total += d.total;
      acc.rent += d.rent;
      acc.elec += d.elec;
      acc.water += d.water;
      if (r.status === 'paid') acc.collected += d.total;
      return acc;
  }, { total: 0, rent: 0, elec: 0, water: 0, collected: 0 });
  
  const toggleSelect = (id: string) => { 
    const newSet = new Set(batch.ids); 
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id); 
    batch.setIds(newSet); 
  };

  const handleSelectAll = () => {
      const allFilteredIds = filtered.map(r => r.id);
      const isAllSelected = allFilteredIds.every(id => batch.ids.has(id));
      if (isAllSelected) {
          const newSet = new Set(batch.ids);
          allFilteredIds.forEach(id => newSet.delete(id));
          batch.setIds(newSet);
      } else {
          const newSet = new Set(batch.ids);
          allFilteredIds.forEach(id => newSet.add(id));
          batch.setIds(newSet);
      }
  };

  const openBatchBill = () => {
      setModal({ type: 'batchBill', data: Array.from(batch.ids) });
  };

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 bg-[#F5F7FA]/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        
        {/* Auth Status Banner - Compressed */}
        <div 
          onClick={() => setModal({ type: 'cloudAuth' })}
          className={`px-4 py-1 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-colors ${cloudUser ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600 animate-pulse'}`}
        >
          {cloudUser ? (
            <><Check size={10}/> 已登录: {cloudUser.email}</>
          ) : (
            <><AlertCircle size={10}/> 未登录 (数据不保存) - 点击登录</>
          )}
        </div>

        <div className="px-4 py-2">
          {batch.isMode ? (
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 w-full bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <button onClick={() => { batch.setMode(false); batch.setIds(new Set()); }} className="p-1 rounded hover:bg-blue-100">
                        <X className="text-blue-500" size={20}/>
                    </button>
                    <span className="font-bold text-blue-800 text-sm">已选 {batch.ids.size}</span>
                    
                    <div className="ml-auto flex gap-2">
                        <button onClick={handleSelectAll} className="text-xs px-2 py-1.5 bg-white text-blue-600 rounded border border-blue-200 font-bold flex items-center gap-1">
                            <ListChecks size={14}/> 全选
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setModal({ type: 'batchEdit' })} 
                        disabled={batch.ids.size === 0} 
                        className="flex-1 text-xs py-2 bg-white text-gray-700 rounded border font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        <Settings2 size={14}/> 批量设置
                    </button>
                    <button 
                        onClick={openBatchBill} 
                        disabled={batch.ids.size === 0} 
                        className="flex-1 text-xs py-2 bg-white text-blue-600 rounded border border-blue-200 font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        <Copy size={14}/> 批量账单
                    </button>
                    <button 
                        onClick={() => confirmAction("批量删除?", `确定删除选中的 ${batch.ids.size} 个房间吗？`, actions.deleteBatch)} 
                        disabled={batch.ids.size === 0} 
                        className="flex-1 text-xs py-2 bg-white text-red-600 rounded border border-red-100 font-bold disabled:opacity-50"
                    >
                        删除
                    </button>
                </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-black text-gray-800">房租管家</h1>
              </div>

              <div className="flex-1 flex justify-end pl-2">
                 <div className="flex items-center gap-2">
                    <button onClick={() => setModal({ type: 'installGuide' })} className="flex items-center justify-center gap-1 bg-black text-white px-2 py-1.5 rounded-full text-xs font-bold shadow-md hover:scale-105 transition-transform whitespace-nowrap">
                      <Download size={12}/> <span>App</span>
                    </button>
                    <button onClick={() => setModal({ type: 'cloudAuth' })} className="flex items-center justify-center gap-1 bg-white border border-blue-100 text-blue-600 px-2 py-1.5 rounded-full text-xs font-bold hover:bg-blue-50 shadow-sm whitespace-nowrap">
                      <Cloud size={12}/> <span>云同步</span>
                    </button>
                    <button onClick={openGuide} className="flex items-center justify-center gap-1 bg-blue-100 text-blue-700 px-2 py-1.5 rounded-full text-xs font-bold hover:bg-blue-200 whitespace-nowrap">
                      <BookOpen size={12}/> <span>指南</span>
                    </button>
                    <button onClick={() => setModal({ type: 'history' })} className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 px-2 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200 whitespace-nowrap">
                      <History size={12}/> <span>历史</span>
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>

        {!batch.isMode && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <span className="font-bold leading-4">注意：点 App 下载到本地更流畅，并可防止数据丢失。</span>
              <button
                onClick={() => setModal({ type: 'contactAuthor' })}
                className="flex-shrink-0 rounded-full bg-white px-2 py-1 font-bold text-amber-700 shadow-sm"
              >
                联系作者
              </button>
            </div>
          </div>
        )}
        
        {/* Compressed Filters */}
        <div className="bg-white/50 backdrop-blur-sm">
          <div className="px-4 py-1 flex gap-2 overflow-x-auto no-scrollbar">
            {allBuildings.map(b => (
              <button 
                key={b} 
                onClick={() => filter.setBuilding(b)} 
                className={`whitespace-nowrap px-3 py-1 rounded-lg text-xs font-bold transition-all border ${filter.building === b ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}
              >
                <Building2 size={12}/> {b === 'all' ? '所有房产' : b}
              </button>
            ))}
          </div>
          <div className="px-4 py-1 flex gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => filter.setDate('all')} 
              className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border ${filter.date === 'all' ? 'bg-gray-700 text-white border-gray-700' : 'bg-transparent text-gray-400 border-transparent'}`}
            >
              全部日期
            </button>
            {allPayDays.map(day => (
              <button 
                key={day} 
                onClick={() => filter.setDate(day.toString())} 
                className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border ${filter.date === day.toString() ? 'bg-gray-700 text-white border-gray-700' : 'bg-transparent text-gray-400 border-transparent'}`}
              >
                {day}号收租
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-1.5 flex flex-col gap-1.5 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-2 py-1">
                <Search className="text-gray-400" size={14} />
                <input 
                  className="bg-transparent text-xs p-1.5 outline-none w-full" 
                  placeholder="输入房号..." 
                  value={search.input} 
                  onChange={e => search.setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && search.run()}
                />
                {search.input && <button onClick={search.clear}><X size={14} className="text-gray-400"/></button>}
              </div>
              <button onClick={search.run} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex-shrink-0">搜索</button>
            </div>
            
            {!batch.isMode && (
                <div className="pt-1.5 border-t border-gray-50">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs text-gray-500">应收总计: <b className="text-gray-900 text-sm">¥{stats.total.toLocaleString()}</b></span>
                        <span className="text-xs text-green-600 font-bold">已收: ¥{stats.collected.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                         <div className="flex gap-2 text-[10px] text-gray-400">
                             <span>房租: ¥{stats.rent.toLocaleString()}</span>
                             <span className="w-px h-3 bg-gray-200"></span>
                             <span>水费: ¥{stats.water.toLocaleString()}</span>
                             <span className="w-px h-3 bg-gray-200"></span>
                             <span>电费: ¥{stats.elec.toLocaleString()}</span>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => batch.setMode(true)} className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1 active:bg-gray-200">
                                <CheckSquare size={10}/> 批量
                            </button>
                            <button onClick={() => setModal({ type: 'newMonth' })} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1 active:bg-blue-100">
                                <RotateCcw size={10}/> 结算
                            </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {displayGroups.map((group, index) => (
          <div key={index}>
            {group.label && (
              <div className="flex items-center gap-2 mb-2 pl-1">
                <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">{group.label}</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2.5">
              {group.rooms.map(room => {
                const details = calcDetails(room);
                const isPaid = room.status === 'paid';
                const isSelected = batch.ids.has(room.id);
                return (
                  <div 
                    key={room.id} 
                    onClick={() => batch.isMode ? toggleSelect(room.id) : navigate('edit', room.id)} 
                    className={`relative flex items-center gap-4 p-3 rounded-xl border transition-all bg-white ${batch.isMode && isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100 shadow-[0_2px_5px_rgba(0,0,0,0.02)]'} ${!batch.isMode && isPaid ? 'opacity-60 grayscale' : 'hover:border-blue-200'}`}
                  >
                    {batch.isMode && (
                      <div className={`mr-1 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                        {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                      </div>
                    )}
                    {!batch.isMode && <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${isPaid ? 'bg-green-400' : 'bg-red-500'}`}></div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-baseline gap-2 overflow-hidden">
                          <span className="text-lg font-bold text-gray-800 whitespace-nowrap">{room.roomNo}</span>
                          {room.tenantName && (
                            <span className="text-xl font-bold text-gray-700 truncate ml-2">
                              {room.tenantName}
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-bold font-mono text-gray-900 flex-shrink-0 ml-2">¥{details.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center h-5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          {/* Removed Building Info/Icon */}
                          {room.moveInDate && <span className="text-gray-400">入住: {room.moveInDate}</span>}
                        </span>
                        {!batch.isMode && !isPaid && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setModal({ type: 'bill', data: room }); }} 
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100"
                          >
                            账单
                          </button>
                        )}
                        {isPaid && <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle size={10}/> 已收</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-20 flex flex-col items-center">
            <FileText size={48} className="mx-auto text-gray-200 mb-2"/>
            <p className="font-bold text-gray-500 mb-2">没有数据</p>
            {!cloudUser && <p className="text-xs text-red-400">请先登录云同步账号</p>}
          </div>
        )}
      </div>

      {!batch.isMode && (
        <button 
          onClick={() => navigate('add')} 
          className="fixed bottom-8 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-40 hover:scale-105 transition"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};
