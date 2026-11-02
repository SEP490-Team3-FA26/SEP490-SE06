// colleagueSearch.service.ts - Nghiệp vụ Tìm Kiếm Đồng Nghiệp Chi Nhánh
// Hỗ trợ tìm kiếm tiếng Việt không dấu (Accent-Insensitive), lọc theo Role, SĐT, Tên
// Chú thích mã nguồn: Tiếng Việt 100% theo chuẩn SEP490/WDP301

export interface ColleagueRecord {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  role?: string;
  phone?: string;
  branchId?: string;
  branchName?: string;
  cchn?: string;
}

// Hàm chuẩn hóa chuỗi tiếng Việt loại bỏ dấu thanh để tìm kiếm mượt mà
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Phân giải vai trò sang nhãn tiếng Việt dễ hiểu
export function getColleagueRoleLabel(role?: string): string {
  switch (role) {
    case 'pharmacist':
      return 'Dược Sĩ Phụ Trách';
    case 'branch':
    case 'headBranch':
    case 'head_branch':
      return 'Quản Lý Chi Nhánh';
    case 'warehouse':
      return 'Quản Lý Kho GSP';
    case 'admin':
    case 'director':
      return 'Ban Giám Đốc';
    default:
      return 'Nhân Sự Chi Nhánh';
  }
}

// Hàm lọc và tìm kiếm đồng nghiệp theo từ khóa và vai trò
export function searchColleagues(
  colleagues: ColleagueRecord[],
  query: string,
  selectedRoleFilter: string = 'ALL'
): ColleagueRecord[] {
  if (!Array.isArray(colleagues)) return [];

  let result = colleagues;

  // Lọc theo vai trò nếu có
  if (selectedRoleFilter && selectedRoleFilter !== 'ALL') {
    result = result.filter((c) => {
      const r = (c.role || '').toLowerCase();
      if (selectedRoleFilter === 'PHARMACIST') return r === 'pharmacist';
      if (selectedRoleFilter === 'BRANCH') return r === 'branch' || r === 'headbranch' || r === 'head_branch';
      if (selectedRoleFilter === 'WAREHOUSE') return r === 'warehouse';
      return true;
    });
  }

  // Tìm kiếm theo từ khóa
  const cleanQ = (query || '').trim();
  if (!cleanQ) return result;

  const normalizedQ = removeVietnameseTones(cleanQ);

  return result.filter((c) => {
    const rawName = c.fullName || c.name || '';
    const normName = removeVietnameseTones(rawName);
    const rawPhone = (c.phone || '').toLowerCase();
    const rawRole = (c.role || '').toLowerCase();
    const roleLabel = removeVietnameseTones(getColleagueRoleLabel(c.role));
    const cchn = (c.cchn || '').toLowerCase();
    const id = (c.id || c._id || '').toLowerCase();

    return (
      normName.includes(normalizedQ) ||
      rawName.toLowerCase().includes(cleanQ.toLowerCase()) ||
      rawPhone.includes(cleanQ.toLowerCase()) ||
      rawRole.includes(cleanQ.toLowerCase()) ||
      roleLabel.includes(normalizedQ) ||
      cchn.includes(cleanQ.toLowerCase()) ||
      id.includes(cleanQ.toLowerCase())
    );
  });
}
