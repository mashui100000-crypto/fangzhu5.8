const { calcRoom, createBillText, formatMoney, getBuildingName, normalizeRoom } = require('../../utils/room');

const app = getApp();

Page({
  data: {
    rooms: [],
    filteredRooms: [],
    stats: {
      total: '0',
      collected: '0',
      rent: '0',
      water: '0',
      elec: '0'
    },
    searchInput: '',
    activeBuilding: 'all',
    activePayDay: 'all',
    buildingTabs: [],
    payDayTabs: [],
    showContact: false
  },

  onShow() {
    this.loadRooms();
  },

  loadRooms() {
    const rooms = wx.getStorageSync(app.globalData.storageKey) || [];
    this.setData({ rooms: Array.isArray(rooms) ? rooms.map(normalizeRoom) : [] }, () => {
      this.refreshView();
    });
  },

  saveRooms(rooms) {
    wx.setStorageSync(app.globalData.storageKey, rooms);
    this.setData({ rooms }, () => {
      this.refreshView();
    });
  },

  refreshView() {
    const search = this.data.searchInput.trim().toLowerCase();
    let filteredRooms = this.data.rooms.slice();

    if (search) {
      filteredRooms = filteredRooms.filter((room) => {
        return [room.roomNo, room.tenantName, room.tenantPhone].some((value) => {
          return String(value || '').toLowerCase().includes(search);
        });
      });
    }

    if (this.data.activeBuilding !== 'all') {
      filteredRooms = filteredRooms.filter((room) => getBuildingName(room.roomNo) === this.data.activeBuilding);
    }

    if (this.data.activePayDay !== 'all') {
      filteredRooms = filteredRooms.filter((room) => String(room.payDay || 1) === this.data.activePayDay);
    }

    filteredRooms.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'unpaid' ? -1 : 1;
      return String(a.roomNo || '').localeCompare(String(b.roomNo || ''), 'zh-CN', { numeric: true });
    });

    const decoratedRooms = filteredRooms.map((room) => {
      const bill = calcRoom(room);
      return Object.assign({}, room, {
        totalText: formatMoney(bill.total),
        rentText: formatMoney(bill.rent),
        waterText: formatMoney(bill.water),
        elecText: formatMoney(bill.elec),
        statusText: room.status === 'paid' ? '已收' : '未收',
        statusClass: room.status === 'paid' ? 'paid' : 'unpaid',
        buildingName: getBuildingName(room.roomNo)
      });
    });

    const stat = filteredRooms.reduce((acc, room) => {
      const bill = calcRoom(room);
      acc.total += bill.total;
      acc.rent += bill.rent;
      acc.water += bill.water;
      acc.elec += bill.elec;
      if (room.status === 'paid') acc.collected += bill.total;
      return acc;
    }, { total: 0, collected: 0, rent: 0, water: 0, elec: 0 });

    const buildings = ['all'].concat(Array.from(new Set(this.data.rooms.map((room) => getBuildingName(room.roomNo)))));
    const payDays = Array.from(new Set(this.data.rooms.map((room) => room.payDay || 1)))
      .sort((a, b) => a - b)
      .map((day) => String(day));
    const buildingTabs = buildings.map((value) => ({
      value,
      label: value === 'all' ? '全部房产' : value,
      activeClass: value === this.data.activeBuilding ? 'active' : ''
    }));
    const payDayTabs = ['all'].concat(payDays).map((value) => ({
      value,
      label: value === 'all' ? '全部日期' : `${value}号收租`,
      activeClass: value === this.data.activePayDay ? 'active-dark' : ''
    }));

    this.setData({
      filteredRooms: decoratedRooms,
      buildingTabs,
      payDayTabs,
      stats: {
        total: formatMoney(stat.total),
        collected: formatMoney(stat.collected),
        rent: formatMoney(stat.rent),
        water: formatMoney(stat.water),
        elec: formatMoney(stat.elec)
      }
    });
  },

  onSearchInput(event) {
    this.setData({ searchInput: event.detail.value }, () => {
      this.refreshView();
    });
  },

  setBuilding(event) {
    this.setData({ activeBuilding: event.currentTarget.dataset.value }, () => {
      this.refreshView();
    });
  },

  setPayDay(event) {
    this.setData({ activePayDay: String(event.currentTarget.dataset.value) }, () => {
      this.refreshView();
    });
  },

  addRoom() {
    wx.navigateTo({ url: '/pages/edit/index?mode=add' });
  },

  editRoom(event) {
    wx.navigateTo({ url: `/pages/edit/index?id=${event.currentTarget.dataset.id}` });
  },

  toggleStatus(event) {
    const id = event.currentTarget.dataset.id;
    const rooms = this.data.rooms.map((room) => {
      if (room.id !== id) return room;
      return Object.assign({}, room, {
        status: room.status === 'paid' ? 'unpaid' : 'paid',
        lastUpdated: new Date().toISOString()
      });
    });
    this.saveRooms(rooms);
  },

  copyBill(event) {
    const id = event.currentTarget.dataset.id;
    const room = this.data.rooms.find((item) => item.id === id);
    if (!room) return;
    wx.setClipboardData({
      data: createBillText(room),
      success: () => wx.showToast({ title: '账单已复制', icon: 'success' })
    });
  },

  deleteRoom(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除房间',
      content: '确定删除这个房间吗？',
      confirmColor: '#dc2626',
      success: (result) => {
        if (!result.confirm) return;
        this.saveRooms(this.data.rooms.filter((room) => room.id !== id));
      }
    });
  },

  startNewMonth() {
    if (this.data.rooms.length === 0) return;
    wx.showModal({
      title: '新月份',
      content: '将本月读数设为上月读数，并把所有房间状态改为未收？',
      confirmColor: '#2563eb',
      success: (result) => {
        if (!result.confirm) return;
        const rooms = this.data.rooms.map((room) => {
          return Object.assign({}, room, {
            elecPrev: Number(room.elecCurr || room.elecPrev || 0),
            waterPrev: Number(room.waterCurr || room.waterPrev || 0),
            elecCurr: '',
            waterCurr: '',
            status: 'unpaid',
            lastUpdated: new Date().toISOString()
          });
        });
        this.saveRooms(rooms);
      }
    });
  },

  openContact() {
    this.setData({ showContact: true });
  },

  closeContact() {
    this.setData({ showContact: false });
  },

  noop() {},

  copyWechat() {
    wx.setClipboardData({
      data: 'pitayaaaaaaaaaaaaaaa',
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    });
  }
});
