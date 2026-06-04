function toNumber(value) {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  const number = toNumber(value);
  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRoom(room) {
  const moveInDate = room.moveInDate || '';
  const payDay = room.payDay || (moveInDate ? Math.max(1, Math.min(31, Number(moveInDate.split('-')[2]) || 1)) : 1);

  return {
    id: room.id || createId(),
    roomNo: (room.roomNo || '').trim(),
    rent: String(room.rent || ''),
    deposit: String(room.deposit || ''),
    payDay,
    moveInDate,
    tenantName: (room.tenantName || '').trim(),
    tenantPhone: (room.tenantPhone || '').trim(),
    tenantIdCard: (room.tenantIdCard || '').trim(),
    fixedElecPrice: String(room.fixedElecPrice || '0'),
    fixedWaterPrice: String(room.fixedWaterPrice || '0'),
    elecPrev: toNumber(room.elecPrev),
    elecCurr: String(room.elecCurr || ''),
    waterPrev: toNumber(room.waterPrev),
    waterCurr: String(room.waterCurr || ''),
    extraFees: Array.isArray(room.extraFees) ? room.extraFees : [],
    status: room.status === 'paid' ? 'paid' : 'unpaid',
    lastUpdated: new Date().toISOString()
  };
}

function getBuildingName(roomNo) {
  const text = String(roomNo || '').trim();
  const match = text.match(/^([^\d-]+)/);
  return match ? match[1] : '其他';
}

function calcRoom(room) {
  const elec = Math.max(0, (toNumber(room.elecCurr) - toNumber(room.elecPrev)) * toNumber(room.fixedElecPrice));
  const water = Math.max(0, (toNumber(room.waterCurr) - toNumber(room.waterPrev)) * toNumber(room.fixedWaterPrice));
  const extra = (room.extraFees || []).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const rent = toNumber(room.rent);
  const total = Math.max(0, rent + elec + water + extra);

  return {
    rent,
    elec,
    water,
    extra,
    total,
    elecUsage: Math.max(0, toNumber(room.elecCurr) - toNumber(room.elecPrev)),
    waterUsage: Math.max(0, toNumber(room.waterCurr) - toNumber(room.waterPrev))
  };
}

function createBillText(room) {
  const bill = calcRoom(room);
  const lines = [
    `房号：${room.roomNo || '未命名'}`,
    room.tenantName ? `租客：${room.tenantName}` : '',
    `房租：${formatMoney(bill.rent)}元`,
    `电费：${formatMoney(bill.elec)}元（${formatMoney(bill.elecUsage)}度 x ${room.fixedElecPrice || 0}）`,
    `水费：${formatMoney(bill.water)}元（${formatMoney(bill.waterUsage)}吨 x ${room.fixedWaterPrice || 0}）`
  ].filter(Boolean);

  if (bill.extra > 0) lines.push(`其他费用：${formatMoney(bill.extra)}元`);
  lines.push(`合计：${formatMoney(bill.total)}元`);
  return lines.join('\n');
}

module.exports = {
  calcRoom,
  createBillText,
  createId,
  formatMoney,
  getBuildingName,
  normalizeRoom,
  toNumber
};
