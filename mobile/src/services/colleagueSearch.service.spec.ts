// colleagueSearch.service.spec.ts - Unit Test Nghiệp Vụ Tìm Kiếm Đồng Nghiệp
// Tuân thủ 100% quy chuẩn Test-Coupled Mandate (sep.md & trienkhaitaskmoi.md):
// 3 nhóm giá trị chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
// Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490

import {
  removeVietnameseTones,
  getColleagueRoleLabel,
  searchColleagues,
  ColleagueRecord,
} from './colleagueSearch.service';

describe('Colleague Search Service - sep.md Standard Unit Tests', () => {
  const mockColleagues: ColleagueRecord[] = [
    {
      id: 'emp-01',
      _id: 'emp-01',
      fullName: 'DS. Lê Hải Yến',
      role: 'pharmacist',
      phone: '0901234567',
      branchName: 'Cơ Sở Chi Nhánh ABC (CN1)',
      cchn: 'CCHN-001-GPP',
    },
    {
      id: 'emp-02',
      _id: 'emp-02',
      fullName: 'DS. Nguyễn Văn An',
      role: 'pharmacist',
      phone: '0902345678',
      branchName: 'Cơ Sở Chi Nhánh ABC (CN1)',
      cchn: 'CCHN-002-GPP',
    },
    {
      id: 'emp-03',
      _id: 'emp-03',
      fullName: 'Trần Minh Khang',
      role: 'warehouse',
      phone: '0903333444',
      branchName: 'Kho Tổng GSP CN1',
      cchn: 'GSP-WH-003',
    },
    {
      id: 'emp-04',
      _id: 'emp-04',
      fullName: 'DS. Phạm Thị Thảo',
      role: 'pharmacist',
      phone: '0904567890',
      branchName: 'Cơ Sở Chi Nhánh ABC (CN1)',
      cchn: 'CCHN-004-GPP',
    },
    {
      id: 'emp-05',
      _id: 'emp-05',
      fullName: 'Ngô Quang Huy',
      role: 'branch',
      phone: '0905678901',
      branchName: 'Cơ Sở Chi Nhánh ABC (CN1)',
    },
  ];

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] - Luồng nghiệp vụ tìm kiếm chuẩn', () => {
    it('1.1. Chuẩn hóa tiếng Việt có dấu thành không dấu chính xác', () => {
      expect(removeVietnameseTones('Lê Hải Yến')).toBe('le hai yen');
      expect(removeVietnameseTones('Nguyễn Văn An')).toBe('nguyen van an');
      expect(removeVietnameseTones('Đỗ Đăng Định')).toBe('do dang dinh');
      expect(removeVietnameseTones('Trần Minh Khang')).toBe('tran minh khang');
    });

    it('1.2. Phân giải đúng nhãn vai trò tiếng Việt', () => {
      expect(getColleagueRoleLabel('pharmacist')).toBe('Dược Sĩ Phụ Trách');
      expect(getColleagueRoleLabel('branch')).toBe('Quản Lý Chi Nhánh');
      expect(getColleagueRoleLabel('headBranch')).toBe('Quản Lý Chi Nhánh');
      expect(getColleagueRoleLabel('warehouse')).toBe('Quản Lý Kho GSP');
      expect(getColleagueRoleLabel('director')).toBe('Ban Giám Đốc');
    });

    it('1.3. Tìm kiếm theo tên có dấu và không dấu trả về đúng nhân sự', () => {
      // Tìm bằng tiếng Việt không dấu "hai yen"
      const resNoTones = searchColleagues(mockColleagues, 'hai yen');
      expect(resNoTones).toHaveLength(1);
      expect(resNoTones[0].fullName).toBe('DS. Lê Hải Yến');

      // Tìm bằng tiếng Việt có dấu "Nguyễn Văn An"
      const resWithTones = searchColleagues(mockColleagues, 'Nguyễn');
      expect(resWithTones).toHaveLength(1);
      expect(resWithTones[0].fullName).toBe('DS. Nguyễn Văn An');
    });

    it('1.4. Tìm kiếm theo số điện thoại', () => {
      const resPhone = searchColleagues(mockColleagues, '0903333444');
      expect(resPhone).toHaveLength(1);
      expect(resPhone[0].fullName).toBe('Trần Minh Khang');
    });

    it('1.5. Lọc danh sách đồng nghiệp theo vai trò Dược sĩ / Kho / Quản lý', () => {
      const pharmacists = searchColleagues(mockColleagues, '', 'PHARMACIST');
      expect(pharmacists).toHaveLength(3);

      const warehouse = searchColleagues(mockColleagues, '', 'WAREHOUSE');
      expect(warehouse).toHaveLength(1);
      expect(warehouse[0].fullName).toBe('Trần Minh Khang');

      const managers = searchColleagues(mockColleagues, '', 'BRANCH');
      expect(managers).toHaveLength(1);
      expect(managers[0].fullName).toBe('Ngô Quang Huy');
    });

    it('1.6. Kết hợp vừa lọc vai trò vừa gõ từ khóa tìm kiếm', () => {
      const res = searchColleagues(mockColleagues, 'thao', 'PHARMACIST');
      expect(res).toHaveLength(1);
      expect(res[0].fullName).toBe('DS. Phạm Thị Thảo');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, không tìm thấy, chữ hoa thường
  // =========================================================================
  describe('[Boundary Values] - Giá trị biên & chống trùng lặp', () => {
    it('2.1. Chuỗi tìm kiếm rỗng hoặc khoảng trắng trả về toàn bộ danh sách', () => {
      expect(searchColleagues(mockColleagues, '')).toHaveLength(mockColleagues.length);
      expect(searchColleagues(mockColleagues, '   ')).toHaveLength(mockColleagues.length);
    });

    it('2.2. Danh sách đồng nghiệp ban đầu rỗng trả về mảng rỗng []', () => {
      expect(searchColleagues([], 'Nguyen')).toEqual([]);
      expect(searchColleagues([], '', 'PHARMACIST')).toEqual([]);
    });

    it('2.3. Không phân biệt hoa thường khi tìm kiếm (Case-insensitive)', () => {
      const resUpper = searchColleagues(mockColleagues, 'KHANG');
      const resLower = searchColleagues(mockColleagues, 'khang');
      expect(resUpper).toEqual(resLower);
      expect(resUpper).toHaveLength(1);
    });

    it('2.4. Tìm kiếm với ký tự đơn lẻ (1 chữ cái)', () => {
      const res = searchColleagues(mockColleagues, 'a');
      expect(res.length).toBeGreaterThan(0);
    });

    it('2.5. Từ khóa không khớp với bất kỳ ai trả về mảng rỗng []', () => {
      const resNotFound = searchColleagues(mockColleagues, 'Người Không Tồn Tại 123456');
      expect(resNotFound).toEqual([]);
    });

    it('2.6. Role filter là ALL trả về tất cả kết quả theo query', () => {
      const res = searchColleagues(mockColleagues, '', 'ALL');
      expect(res).toHaveLength(mockColleagues.length);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, null, undefined, ký tự đặc biệt
  // =========================================================================
  describe('[Abnormal Values] - Xử lý dữ liệu dị thường & bảo vệ ứng dụng', () => {
    it('3.1. Dữ liệu null hoặc undefined cho hàm removeVietnameseTones không gây lỗi runtime', () => {
      expect(removeVietnameseTones(null as any)).toBe('');
      expect(removeVietnameseTones(undefined as any)).toBe('');
      expect(removeVietnameseTones('')).toBe('');
    });

    it('3.2. Role không hợp lệ hoặc undefined trả về nhãn mặc định an toàn', () => {
      expect(getColleagueRoleLabel(undefined)).toBe('Nhân Sự Chi Nhánh');
      expect(getColleagueRoleLabel(null as any)).toBe('Nhân Sự Chi Nhánh');
      expect(getColleagueRoleLabel('unknown_role_xyz')).toBe('Nhân Sự Chi Nhánh');
    });

    it('3.3. Colleagues truyền vào null/undefined trả về mảng rỗng []', () => {
      expect(searchColleagues(null as any, 'Nguyen')).toEqual([]);
      expect(searchColleagues(undefined as any, 'Nguyen')).toEqual([]);
    });

    it('3.4. Dữ liệu phần tử đồng nghiệp thiếu các trường name, role, phone vẫn tìm kiếm an toàn', () => {
      const corruptedColleagues: ColleagueRecord[] = [
        { id: 'corrupt-1' },
        { id: 'corrupt-2', fullName: undefined, phone: undefined },
        { id: 'corrupt-3', name: 'Nhân viên hợp lệ', phone: '0912345678' },
      ];
      const res = searchColleagues(corruptedColleagues, 'hợp lệ');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('corrupt-3');
    });

    it('3.5. Từ khóa chứa ký tự đặc biệt XSS hoặc Regex không làm crash hàm', () => {
      const specialQueries = ['<script>alert(1)</script>', '.*', '\\', '^$', '[a-z]+', 'null', 'undefined'];
      for (const q of specialQueries) {
        expect(() => searchColleagues(mockColleagues, q)).not.toThrow();
      }
    });
  });
});
