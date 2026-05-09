
import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { safeGetStorage, calculateBillPeriod } from './utils';
import { STORAGE_KEY_CONFIG, STORAGE_KEY_DATA, DEFAULT_CONFIG } from './constants';
import { Room, AppConfig, HistoryState, ActionHandlers, ModalState, InstallPromptEvent, BillRecord, BatchSettingsData } from './types';
import { isSupabaseConfigured, supabase } from './services/supabase';
import { loadRoomsFromSupabase, saveRoomsToSupabase } from './services/landlordBackup';

// Components
import { RoomListView } from './components/RoomListView';
import { RoomEditView } from './components/RoomEditView';
import { UserGuideView } from './components/UserGuideView';
import { AddRoomModal } from './components/AddRoomModal';
import { HistoryModal } from './components/HistoryModal';
import { BillPreviewModal } from './components/BillPreviewModal';
import { BillHistoryModal } from './components/BillHistoryModal';
import { NewMonthModal } from './components/NewMonthModal';
import { BatchEditModal } from './components/BatchEditModal'; // Changed import
import { GenericConfirmModal } from './components/GenericConfirmModal';
import { MoveOutModal } from './components/MoveOutModal';
import { BatchBillModal } from './components/BatchBillModal';
import { CloudAuthModal } from './components/CloudAuthModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ContactAuthorModal } from './components/ContactAuthorModal';

const AUTH_TIMEOUT_MS = 20000;

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

export default function App() {
  // --- Core State ---
  const [history, setHistory] = useState<HistoryState>({ archives: [], present: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'list' | 'edit' | 'add' | 'guide'>('list');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Search & Filter
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeBuilding, setActiveBuilding] = useState('all');
  const [activeDateTab, setActiveDateTab] = useState('all');

  // Batch Selection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [modal, setModal] = useState<ModalState>({ type: null });

  // Config State (Local preferences only, connection details are constants)
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Cloud Sync State
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [isCloudHydrated, setIsCloudHydrated] = useState(false);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  const getUserStorageKey = (userId: string) => `${STORAGE_KEY_DATA}_${userId}`;

  const replaceRooms = (rooms: Room[], desc: string) => {
    setHistory({
      archives: [{ data: rooms, desc, time: new Date().toISOString() }],
      present: rooms,
    });
  };

  const hydrateCloudRooms = async (userId: string) => {
    setIsCloudHydrated(false);

    const cachedRooms = safeGetStorage<Room[]>(getUserStorageKey(userId), []);
    if (Array.isArray(cachedRooms) && cachedRooms.length > 0) {
      replaceRooms(cachedRooms, '本地缓存');
    }

    try {
      if (!supabase) return;
      const cloudRooms = await loadRoomsFromSupabase(supabase, userId);
      replaceRooms(cloudRooms, '云端同步');
    } catch (error) {
      console.warn('Cloud sync failed:', error);
    } finally {
      setIsCloudHydrated(true);
    }
  };

  const loadCachedRoomsForUser = (userId: string) => {
    const cachedRooms = safeGetStorage<Room[]>(getUserStorageKey(userId), []);
    replaceRooms(Array.isArray(cachedRooms) ? cachedRooms : [], '本地缓存');
  };

  const activateCloudUser = (user: User) => {
    setCloudUser(user);
    window.setTimeout(() => {
      hydrateCloudRooms(user.id);
    }, 0);
  };

  // --- Initialization ---
  useEffect(() => {
    let isMounted = true;

    const initApp = async () => {
      // 1. Load Local Config (Settings)
      const savedConfig = safeGetStorage(STORAGE_KEY_CONFIG, null);
      if (savedConfig && isMounted) setConfig(savedConfig);

      // 2. Supabase Auth session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (isMounted) setCloudUser(session.user);
            loadCachedRoomsForUser(session.user.id);
            if (isMounted) setIsLoaded(true);
            hydrateCloudRooms(session.user.id);
            return;
          } else {
            if (isMounted) {
              setCloudUser(null);
              setIsCloudHydrated(false);
              setHistory({ archives: [], present: [] });
              setView('list');
            }
          }
        } catch (e) {
           console.error("Auth check failed", e);
           if (isMounted) setHistory({ archives: [], present: [] });
        }
      } else {
         // No Supabase Config: Load Local (Pure Offline Mode)
         let initialRooms = safeGetStorage<Room[]>(STORAGE_KEY_DATA, []);
         if (!Array.isArray(initialRooms)) initialRooms = [];
         replaceRooms(initialRooms, '初始状态');
         if (initialRooms.length === 0 && isMounted) setView('guide');
      }

      if (isMounted) setIsLoaded(true);
    };

    initApp();

    const authListener = supabase?.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setCloudUser(session?.user || null);

      if (event === 'SIGNED_IN' && session?.user) {
        activateCloudUser(session.user);
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(STORAGE_KEY_DATA);
        setHistory({ archives: [], present: [] });
        setSelectedIds(new Set());
        setIsCloudHydrated(false);
        setView('list');
      }
    });
    const subscription = authListener?.data.subscription;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []); // Only run once on mount

  // --- Auto Save to LocalStorage ---
  // Only save if logged in or using offline mode.
  useEffect(() => {
    if (isLoaded && history.present) {
      if (cloudUser || !isSupabaseConfigured) {
         const storageKey = cloudUser ? getUserStorageKey(cloudUser.id) : STORAGE_KEY_DATA;
         localStorage.setItem(storageKey, JSON.stringify(history.present));
      }
    }
  }, [history.present, isLoaded, cloudUser]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config, isLoaded]);

  // --- AUTOMATIC CLOUD BACKUP EFFECT ---
  useEffect(() => {
    if (!isLoaded || !supabase || !cloudUser || !isCloudHydrated) return;
    const timer = setTimeout(() => {
        saveRoomsToSupabase(supabase, cloudUser.id, history.present).catch(err => {
            console.warn("Auto backup failed:", err);
        });
    }, 2000);
    return () => clearTimeout(timer);
  }, [history.present, isLoaded, cloudUser, isCloudHydrated]);


  // --- Handlers ---
  const handleCloudLogin = async (email: string, pass: string, isSignup: boolean) => {
    if (!supabase) return '系统未配置 Supabase';
    const normalizedEmail = email.trim().toLowerCase();
    
    if (isSignup) {
      const { data, error } = await withTimeout(supabase.auth.signUp({
          email: normalizedEmail,
          password: pass
      }), '连接 Supabase 超时，请检查网络后再试');
      if (error) return error.message;

      const sessionUser = data.session?.user || data.user;
      if (!data.session && data.user) {
        const { data: loginData, error: loginError } = await withTimeout(
          supabase.auth.signInWithPassword({ email: normalizedEmail, password: pass }),
          '注册成功，但自动登录超时，请手动登录一次'
        );

        if (loginError) {
          return '注册成功，但 Supabase 后台仍开启了邮箱确认。请关闭 Authentication > Providers > Email > Confirm email 后再注册。';
        }

        if (loginData.user) {
          activateCloudUser(loginData.user);
        }

        return;
      }

      if (sessionUser) {
        activateCloudUser(sessionUser);
      } else {
        return '注册没有返回用户信息，请稍后重试';
      }
      return;
    } else {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: normalizedEmail, password: pass }),
        '连接 Supabase 超时，请检查网络后再试'
      );
      if (!error && data.user) {
        activateCloudUser(data.user);
      }
      return error?.message;
    }
  };

  const handleUpdatePassword = async (pass: string) => {
    if (!supabase) return '系统未配置 Supabase';
    const { error } = await withTimeout(
      supabase.auth.updateUser({ password: pass }),
      '连接 Supabase 超时，请检查网络后再试'
    );
    return error?.message;
  };

  const handleCloudLogout = async () => {
    const userStorageKey = cloudUser ? getUserStorageKey(cloudUser.id) : null;
    if (supabase) {
        try { await supabase.auth.signOut(); } catch (e) {}
    }
    localStorage.removeItem(STORAGE_KEY_DATA);
    if (userStorageKey) localStorage.removeItem(userStorageKey);
    setHistory({ archives: [], present: [] });
    setCloudUser(null);
    setIsCloudHydrated(false);
    setSelectedIds(new Set());
  };

  // --- Calculation Helpers ---
  const calculateTotal = (r: Room): number => {
    const getVal = (v: any) => parseFloat(v) || 0;
    const ep = r.fixedElecPrice || '0';
    const wp = r.fixedWaterPrice || '0';
    const e = (getVal(r.elecCurr) - getVal(r.elecPrev)) * getVal(ep);
    const w = (getVal(r.waterCurr) - getVal(r.waterPrev)) * getVal(wp);
    const extra = (r.extraFees || []).reduce((sum, item) => sum + getVal(item.amount), 0);
    return Math.max(0, getVal(r.rent) + Math.max(0, e) + Math.max(0, w) + extra);
  };

  const processSettlement = (r: Room): Room => {
      const record: BillRecord = {
          id: Date.now().toString() + Math.random(),
          recordedAt: new Date().toISOString(),
          startDate: r.billStartDate || '',
          endDate: r.billEndDate || '',
          rent: r.rent,
          elecPrev: r.elecPrev,
          elecCurr: r.elecCurr,
          waterPrev: r.waterPrev,
          waterCurr: r.waterCurr,
          extraFees: [...(r.extraFees || [])],
          total: calculateTotal(r),
          tenantName: r.tenantName,
          tenantIdCard: r.tenantIdCard,
          roomNo: r.roomNo
      };
      const newHistory = [...(r.billHistory || []), record];
      const payDayInt = r.payDay ? parseInt(String(r.payDay)) : 1;
      const { start, end } = calculateBillPeriod(payDayInt, r.billEndDate);
      
      return {
        ...r,
        elecPrev: r.elecCurr ? parseFloat(r.elecCurr) : r.elecPrev,
        elecCurr: '',
        waterPrev: r.waterCurr ? parseFloat(r.waterCurr) : r.waterPrev,
        waterCurr: '',
        status: 'unpaid' as const,
        billStartDate: start,
        billEndDate: end,
        billHistory: newHistory
      };
  };

  // --- Core State Updates ---
  const commitChange = (newRooms: Room[], desc: string) => {
    setHistory(curr => ({
      archives: [{ data: newRooms, desc, time: new Date().toISOString() }, ...curr.archives].slice(0, 50),
      present: newRooms
    }));
  };

  const handleRestore = (index: number) => {
    const target = history.archives[index];
    if (target) {
      commitChange(target.data, `恢复至: ${target.desc}`);
      setModal({ type: null });
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const createRoomObj = (data: Partial<Room>, index = 0): Room => {
    const payDay = typeof data.payDay === 'number' ? data.payDay : 1;
    const { start, end } = calculateBillPeriod(payDay);

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      roomNo: data.roomNo || '未命名',
      rent: data.rent || config.defaultRent,
      deposit: data.deposit || '',
      payDay: payDay,
      moveInDate: data.moveInDate,
      tenantName: '',
      tenantPhone: '',
      tenantIdCard: '',
      fixedElecPrice: data.fixedElecPrice || '',
      fixedWaterPrice: data.fixedWaterPrice || '',
      elecPrev: 0,
      elecCurr: '',
      waterPrev: 0,
      waterCurr: '',
      extraFees: [],
      status: 'unpaid',
      lastUpdated: new Date().toISOString(),
      billStartDate: start,
      billEndDate: end,
      billHistory: []
    };
  };

  const actions: ActionHandlers = {
    addRoom: (data) => {
      if (history.present.some(r => r.roomNo === data.roomNo)) return alert("房间号已存在");
      commitChange([...history.present, createRoomObj(data)], `添加 ${data.roomNo}`);
      setView('list');
    },

    batchAddConfirmed: (previewRooms) => {
      const uniqueRooms = previewRooms.filter(n => !history.present.some(o => o.roomNo === n.roomNo));
      if (uniqueRooms.length === 0) return alert("没有生成新房间(可能全部已存在)");
      const newItems = uniqueRooms.map((d, i) => createRoomObj(d, i));
      commitChange([...history.present, ...newItems], `批量生成 ${newItems.length} 间`);
      setView('list');
    },

    updateRoom: (id, data) => {
      setHistory(curr => ({
        ...curr,
        present: curr.present.map(r => r.id === id ? { ...r, ...data } : r)
      }));
    },

    saveRoom: (id, data) => {
      commitChange(
        history.present.map(r => r.id === id ? { ...r, ...data } : r),
        "更新房间信息"
      );
    },

    deleteSingle: (id) => {
      commitChange(history.present.filter(r => r.id !== id), "删除房间");
      setView('list');
      setModal({ type: null });
    },

    deleteBatch: () => {
      commitChange(
        history.present.filter(r => !selectedIds.has(r.id)),
        `批量删除 ${selectedIds.size} 项`
      );
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setModal({ type: null });
    },

    updateBatchSettings: (settings: BatchSettingsData) => {
      const updatedRooms = history.present.map(r => {
        if (!selectedIds.has(r.id)) return r;
        const updates: Partial<Room> = {};
        
        if (settings.payDay) updates.payDay = parseInt(settings.payDay);
        if (settings.rent) updates.rent = settings.rent;
        if (settings.fixedElecPrice) updates.fixedElecPrice = settings.fixedElecPrice;
        if (settings.fixedWaterPrice) updates.fixedWaterPrice = settings.fixedWaterPrice;
        
        return { ...r, ...updates };
      });

      commitChange(updatedRooms, "批量修改设置");
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setModal({ type: null });
      setActiveDateTab('all');
    },

    newMonth: (targetDay) => {
      const updated = history.present.map(r => {
        if (targetDay !== 'all') {
            const rDay = r.payDay ? parseInt(String(r.payDay)) : 1;
            const tDay = parseInt(String(targetDay));
            if (rDay !== tDay) return r;
        }
        return processSettlement(r);
      });
      commitChange(updated, "批量开启新月份");
      setModal({ type: null });
    },

    settleSingleRoom: (id: string) => {
        const target = history.present.find(r => r.id === id);
        if (!target) return;
        const updated = history.present.map(r => r.id !== id ? r : processSettlement(r));
        commitChange(updated, `单个结算: ${target.roomNo}`);
    },

    moveOut: (id, returnDeposit) => {
      const target = history.present.find(r => r.id === id);
      if (!target) return;
      const updated: Room = { 
        ...target, 
        deposit: returnDeposit ? '0' : target.deposit, 
        tenantName: '',
        tenantPhone: '',
        tenantIdCard: '',
        status: 'unpaid', 
        extraFees: [] 
      };
      commitChange(
        history.present.map(r => r.id === id ? updated : r), 
        `房间 ${target.roomNo} 退租`
      );
      setModal({ type: null });
      setView('list');
    }
  };

  const handleSearch = () => setActiveSearch(searchInput);
  const clearSearch = () => { setSearchInput(''); setActiveSearch(''); };

  const confirmAction = (title: string, content: string, action: () => void) => {
    setModal({ type: 'genericConfirm', title, content, onConfirm: action });
  };
  
  const viewHistoryRecord = (record: BillRecord) => {
     const currentRoom = history.present.find(r => r.roomNo === record.roomNo);
     if (!currentRoom) return;
     // Reconstruct temp room for preview
     const tempRoom: Room = {
         ...currentRoom, 
         id: record.id,
         roomNo: record.roomNo,
         rent: record.rent,
         elecPrev: record.elecPrev,
         elecCurr: record.elecCurr,
         waterPrev: record.waterPrev,
         waterCurr: record.waterCurr,
         extraFees: record.extraFees,
         billStartDate: record.startDate,
         billEndDate: record.endDate,
         tenantName: record.tenantName,
         tenantIdCard: record.tenantIdCard,
         deposit: '0', 
         payDay: 1, 
         status: 'paid',
         lastUpdated: record.recordedAt
     };
     setModal({ type: 'bill', data: tempRoom });
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center text-gray-500">正在启动...</div>;

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#1A1A1A]">
      {view === 'list' && (
        <RoomListView
          rooms={history.present}
          search={{ input: searchInput, setInput: setSearchInput, active: activeSearch, run: handleSearch, clear: clearSearch }}
          filter={{ building: activeBuilding, setBuilding: setActiveBuilding, date: activeDateTab, setDate: setActiveDateTab }}
          batch={{ isMode: isSelectionMode, setMode: setIsSelectionMode, ids: selectedIds, setIds: setSelectedIds }}
          actions={actions}
          openGuide={() => setView('guide')}
          navigate={(v, id) => { setView(v); if (id) setActiveRoomId(id); }}
          setModal={setModal}
          confirmAction={confirmAction}
          config={config}
          cloudUser={cloudUser}
        />
      )}

      {view === 'edit' && activeRoomId && (
        <RoomEditView
          room={history.present.find(r => r.id === activeRoomId)}
          config={config}
          actions={actions}
          onBack={() => setView('list')}
          setModal={setModal}
          confirmAction={confirmAction}
        />
      )}

      {view === 'guide' && <UserGuideView onClose={() => setView('list')} />}

      {view === 'add' && (
        <AddRoomModal 
          config={config} 
          onSave={actions.addRoom} 
          onBatchConfirmed={actions.batchAddConfirmed} 
          onCancel={() => setView('list')} 
          confirmAction={confirmAction} 
        />
      )}

      {/* Modals */}
      {modal.type === 'history' && (
        <HistoryModal archives={history.archives} onRestore={handleRestore} onClose={() => setModal({ type: null })} />
      )}
      
      {modal.type === 'bill' && modal.data && (
        <BillPreviewModal room={modal.data} onClose={() => setModal({ type: null })} />
      )}

      {modal.type === 'billHistory' && modal.data && (
        <BillHistoryModal 
            room={modal.data} 
            onSelect={viewHistoryRecord}
            onClose={() => setModal({ type: null })} 
        />
      )}

      {modal.type === 'batchBill' && modal.data && (
        <BatchBillModal 
          rooms={history.present.filter(r => modal.data.includes(r.id)).sort((a,b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))} 
          onClose={() => setModal({ type: null })} 
        />
      )}
      
      {modal.type === 'moveOut' && modal.data && (
        <MoveOutModal 
          room={modal.data} 
          config={config} 
          onConfirm={actions.moveOut} 
          onCancel={() => setModal({ type: null })} 
        />
      )}

      {modal.type === 'newMonth' && (
        <NewMonthModal rooms={history.present} onAction={actions.newMonth} onCancel={() => setModal({ type: null })} />
      )}
      
      {modal.type === 'batchEdit' && (
        <BatchEditModal count={selectedIds.size} onConfirm={actions.updateBatchSettings} onCancel={() => setModal({ type: null })} />
      )}

      {modal.type === 'genericConfirm' && modal.onConfirm && (
        <GenericConfirmModal
          title={modal.title}
          content={modal.content}
          onConfirm={() => { modal.onConfirm!(); setModal({ type: null }); }}
          onCancel={() => setModal({ type: null })}
        />
      )}

      {modal.type === 'cloudAuth' && (
        <CloudAuthModal 
          initialMode={modal.data?.mode}
          onLogin={handleCloudLogin}
          onUpdatePassword={handleUpdatePassword}
          onLogout={handleCloudLogout}
          currentUser={cloudUser}
          onClose={() => setModal({ type: null })}
        />
      )}

      {modal.type === 'installGuide' && (
        <InstallGuideModal
          installPrompt={installPrompt}
          onInstall={handleInstallApp}
          onClose={() => setModal({ type: null })}
        />
      )}

      {modal.type === 'contactAuthor' && (
        <ContactAuthorModal onClose={() => setModal({ type: null })} />
      )}
    </div>
  );
}
