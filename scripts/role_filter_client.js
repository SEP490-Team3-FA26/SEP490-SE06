/**
 * Client-side script logic for Role Filter & Navigation in docs/mobile_v2/index.html
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

const ROLES = [
  { id: 'all', label: 'Tất Cả Vai Trò', icon: '🌟', short: 'Tất cả' },
  { id: 'customer', label: 'Khách Hàng', icon: '🛒', short: 'Khách hàng' },
  { id: 'pharmacist', label: 'Dược Sĩ POS', icon: '💊', short: 'Dược sĩ' },
  { id: 'warehouse', label: 'Thủ Kho GSP', icon: '📦', short: 'Thủ kho' },
  { id: 'branch', label: 'Quản Lý Chi Nhánh', icon: '🏢', short: 'Chi nhánh' },
  { id: 'director', label: 'Ban Giám Đốc', icon: '📊', short: 'Giám đốc' },
  { id: 'guest', label: 'Khách & Auth', icon: '🔐', short: 'Auth' },
  { id: 'admin', label: 'Quản Trị IT', icon: '👥', short: 'Admin' }
];

const ROLE_CONFIG = {};
ROLES.forEach(r => { ROLE_CONFIG[r.id] = r; });

let activeScreenIndex = 0;
let currentRoleFilter = 'all';
let currentSearchQuery = '';
let isFullPageMode = false;
let isGridMode = false;
let isSidebarOpen = true;
let isDrawerOpen = true;
let isDemoMode = false;
const feedbackNotes = [];

// Lấy danh sách index các màn hình thỏa mãn bộ lọc vai trò và tìm kiếm
function getFilteredScreenIndices() {
  const indices = [];
  SCREENS.forEach((s, idx) => {
    const matchRole = currentRoleFilter === 'all' || s.role === currentRoleFilter;
    if (!matchRole) return;
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) ||
                          s.id.toLowerCase().includes(q) ||
                          s.category.toLowerCase().includes(q) ||
                          (s.description && s.description.toLowerCase().includes(q));
      if (!matchSearch) return;
    }
    indices.push(idx);
  });
  return indices;
}

// Khởi tạo các nút lọc vai trò (Canvas Bar và Sidebar)
function initRoleFilters() {
  const pillsContainer = document.getElementById('roleFilterPills');
  const sidebarPillsContainer = document.getElementById('sidebarRolePills');
  if (pillsContainer) pillsContainer.innerHTML = '';
  if (sidebarPillsContainer) sidebarPillsContainer.innerHTML = '';

  ROLES.forEach(r => {
    const count = r.id === 'all' ? SCREENS.length : SCREENS.filter(s => s.role === r.id).length;

    // Pill trên Canvas Filter Bar
    if (pillsContainer) {
      const pill = document.createElement('button');
      pill.className = 'role-pill' + (r.id === currentRoleFilter ? ' active' : '');
      pill.dataset.role = r.id;
      pill.onclick = () => setRoleFilter(r.id);
      pill.innerHTML = `
        <span>${r.icon} ${r.label}</span>
        <span class="role-count">${count}</span>
      `;
      pillsContainer.appendChild(pill);
    }

    // Mini-pill trong Sidebar
    if (sidebarPillsContainer) {
      const miniPill = document.createElement('button');
      miniPill.className = 'sidebar-role-pill' + (r.id === currentRoleFilter ? ' active' : '');
      miniPill.dataset.role = r.id;
      miniPill.onclick = () => setRoleFilter(r.id);
      miniPill.title = `${r.label} (${count} màn hình)`;
      miniPill.innerHTML = `${r.icon} ${r.short} <span style="font-size: 9.5px; opacity: 0.85;">(${count})</span>`;
      sidebarPillsContainer.appendChild(miniPill);
    }
  });
}

// Đặt bộ lọc vai trò
function setRoleFilter(roleId) {
  currentRoleFilter = roleId;

  document.querySelectorAll('.role-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === roleId);
  });

  document.querySelectorAll('.sidebar-role-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === roleId);
  });

  const filteredIndices = getFilteredScreenIndices();
  const summaryEl = document.getElementById('roleDisplayCount');
  if (summaryEl) {
    const roleMeta = ROLE_CONFIG[roleId] || { label: 'Tất cả' };
    summaryEl.innerHTML = `${filteredIndices.length} / ${SCREENS.length} <span style="color: #94A3B8; font-size: 11px; font-weight: normal;">(${roleMeta.label})</span>`;
  }

  initSidebar();

  if (isGridMode) {
    renderGrid();
  } else {
    if (filteredIndices.length > 0 && !filteredIndices.includes(activeScreenIndex)) {
      selectScreen(filteredIndices[0]);
    } else if (filteredIndices.length > 0) {
      selectScreen(activeScreenIndex);
    }
  }
}

// Nhóm màn hình theo danh mục trong Sidebar (hỗ trợ lọc theo Role & Search)
function initSidebar() {
  const listContainer = document.getElementById('screenListContainer');
  listContainer.innerHTML = '';

  const filteredIndices = getFilteredScreenIndices();
  const categories = [...new Set(SCREENS.map(s => s.category))];

  let anyCategoryRendered = false;

  categories.forEach(cat => {
    const catIndices = filteredIndices.filter(idx => SCREENS[idx].category === cat);
    if (catIndices.length === 0) return;

    anyCategoryRendered = true;
    const group = document.createElement('div');
    group.className = 'category-group';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span>${cat}</span><span class="category-header-count">${catIndices.length}</span>`;
    group.appendChild(header);

    catIndices.forEach(idx => {
      const s = SCREENS[idx];
      const roleMeta = ROLE_CONFIG[s.role] || { icon: '📱', short: s.role };
      const item = document.createElement('div');
      item.className = 'screen-item' + (idx === activeScreenIndex ? ' active' : '');
      item.id = 'screen-item-' + idx;
      item.onclick = () => selectScreen(idx);

      item.innerHTML = `
        <div class="screen-item-thumb">
          <img src="${s.phoneImage}" alt="${s.name}" onerror="this.src='../mobile_v1/${s.phoneImage}'">
        </div>
        <div class="screen-item-content">
          <div class="screen-item-title">${s.name}</div>
          <div class="screen-item-meta">
            <span class="screen-item-role-tag role-${s.role}">${roleMeta.icon} ${roleMeta.short}</span>
            <span class="screen-item-sub">${s.id}</span>
          </div>
        </div>
      `;

      group.appendChild(item);
    });

    listContainer.appendChild(group);
  });

  if (!anyCategoryRendered) {
    listContainer.innerHTML = `
      <div style="padding: 30px 16px; text-align: center; color: #64748B; font-size: 12.5px; line-height: 1.6;">
        🔍 Không có màn hình nào phù hợp với vai trò này.<br>
        <button class="btn-pill" style="margin-top: 12px; font-size: 11px;" onclick="setRoleFilter('all')">
          <span>Xem Tất Cả</span>
        </button>
      </div>
    `;
  }
}

// ĐÓNG / MỞ NAVBAR SIDEBAR (TOGGLE)
function toggleSidebar() {
  isSidebarOpen = !isSidebarOpen;
  const sidebar = document.getElementById('sidebarContainer');
  const btn = document.getElementById('btnToggleSidebar');
  const floatingBtn = document.getElementById('floatingSidebarToggle');

  if (isSidebarOpen) {
    sidebar.classList.remove('collapsed');
    btn.classList.add('active');
    floatingBtn.classList.remove('visible');
  } else {
    sidebar.classList.add('collapsed');
    btn.classList.remove('active');
    floatingBtn.classList.add('visible');
  }
}

// ĐÓNG / MỞ DRAWER BÊN PHẢI
function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
  const drawer = document.getElementById('feedbackDrawer');
  const btn = document.getElementById('btnToggleDrawer');

  if (isDrawerOpen) {
    drawer.classList.remove('collapsed');
    btn.classList.add('active');
  } else {
    drawer.classList.add('collapsed');
    btn.classList.remove('active');
  }
}

// CHẾ ĐỘ DEMO KHÁCH HÀNG (ZEN MODE)
function toggleDemoMode() {
  isDemoMode = !isDemoMode;
  const sidebar = document.getElementById('sidebarContainer');
  const drawer = document.getElementById('feedbackDrawer');
  const floatingBtn = document.getElementById('floatingSidebarToggle');
  const btn = document.getElementById('btnDemoMode');

  if (isDemoMode) {
    isSidebarOpen = false;
    isDrawerOpen = false;
    sidebar.classList.add('collapsed');
    drawer.classList.add('collapsed');
    floatingBtn.classList.add('visible');
    btn.classList.add('active');
    document.getElementById('demoModeText').textContent = '✓ Đang Demo Khách';
  } else {
    isSidebarOpen = true;
    isDrawerOpen = true;
    sidebar.classList.remove('collapsed');
    drawer.classList.remove('collapsed');
    floatingBtn.classList.remove('visible');
    btn.classList.remove('active');
    document.getElementById('demoModeText').textContent = 'Demo Khách Hàng';
  }
}

// Chọn màn hình
function selectScreen(index) {
  activeScreenIndex = index;
  const screen = SCREENS[index];
  const roleMeta = ROLE_CONFIG[screen.role] || { icon: '📱', label: screen.role, short: screen.role };

  // Update sidebar active state
  document.querySelectorAll('.screen-item').forEach((el) => {
    el.classList.toggle('active', el.id === 'screen-item-' + index);
  });

  // Update Stage
  const roleBadgeEl = document.getElementById('stage-screen-role');
  if (roleBadgeEl) {
    roleBadgeEl.className = 'role-badge role-' + screen.role;
    roleBadgeEl.innerHTML = `${roleMeta.icon} ${roleMeta.label}`;
  }
  document.getElementById('stage-screen-category').textContent = screen.category;
  document.getElementById('stage-screen-title').textContent = screen.name;
  document.getElementById('stage-screen-dims').textContent = isFullPageMode ? `(412 x ${screen.pageHeight}px Full)` : '(412 x 915px Phone)';
  
  const img = document.getElementById('stage-screen-img');
  img.src = isFullPageMode ? screen.fullImage : screen.phoneImage;
  img.onerror = function() {
    this.src = '../mobile_v1/' + (isFullPageMode ? screen.fullImage : screen.phoneImage);
  };

  // Reset scroll top of phone
  document.getElementById('phone-screen-container').scrollTop = 0;

  // Update Drawer
  document.getElementById('feedback-screen-name').textContent = screen.name;
  document.getElementById('feedback-screen-id').textContent = screen.id;
  document.getElementById('feedback-screen-desc').textContent = screen.description;
  document.getElementById('feedback-screen-url').textContent = screen.url;

  // Update Presenter Floating Bar
  const filteredIndices = getFilteredScreenIndices();
  const currentPos = filteredIndices.indexOf(index);
  const posText = currentPos >= 0 ? `${currentPos + 1} / ${filteredIndices.length}` : `${index + 1} / ${SCREENS.length}`;
  document.getElementById('presenterTitle').textContent = screen.name;
  document.getElementById('presenterCounter').textContent = `${posText} • [${roleMeta.short}]`;

  if (isGridMode) {
    toggleGridMode();
  }
}

function nextScreen() {
  const filteredIndices = getFilteredScreenIndices();
  if (filteredIndices.length === 0) return;
  const currentPos = filteredIndices.indexOf(activeScreenIndex);
  if (currentPos >= 0 && currentPos < filteredIndices.length - 1) {
    selectScreen(filteredIndices[currentPos + 1]);
  } else {
    selectScreen(filteredIndices[0]);
  }
}

function prevScreen() {
  const filteredIndices = getFilteredScreenIndices();
  if (filteredIndices.length === 0) return;
  const currentPos = filteredIndices.indexOf(activeScreenIndex);
  if (currentPos > 0) {
    selectScreen(filteredIndices[currentPos - 1]);
  } else {
    selectScreen(filteredIndices[filteredIndices.length - 1]);
  }
}

// Đổi tab chính trên Topbar
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-tab-content').forEach(content => content.classList.remove('active'));

  const presenterBar = document.getElementById('presenterBar');
  const floatingBtn = document.getElementById('floatingSidebarToggle');

  if (tabId === 'all-screens') {
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
    document.getElementById('tab-all-screens').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'flex';
    document.getElementById('feedbackDrawer').style.display = 'flex';
    presenterBar.style.display = 'flex';
    if (!isSidebarOpen) floatingBtn.classList.add('visible');
  } else if (tabId === 'redesign') {
    document.querySelectorAll('.nav-btn')[1].classList.add('active');
    document.getElementById('tab-redesign').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'none';
    document.getElementById('feedbackDrawer').style.display = 'none';
    presenterBar.style.display = 'none';
    floatingBtn.classList.remove('visible');
  } else if (tabId === 'cards') {
    document.querySelectorAll('.nav-btn')[2].classList.add('active');
    document.getElementById('tab-cards').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'none';
    document.getElementById('feedbackDrawer').style.display = 'none';
    presenterBar.style.display = 'none';
    floatingBtn.classList.remove('visible');
  } else if (tabId === 'audit') {
    document.querySelectorAll('.nav-btn')[3].classList.add('active');
    document.getElementById('tab-audit').classList.add('active');
    document.getElementById('sidebarContainer').style.display = 'none';
    document.getElementById('feedbackDrawer').style.display = 'none';
    presenterBar.style.display = 'none';
    floatingBtn.classList.remove('visible');
  }
}

// Toggle Phone Frame vs Full Page
function toggleViewMode() {
  isFullPageMode = !isFullPageMode;
  const mockup = document.getElementById('phone-mockup');
  const btn = document.getElementById('btn-toggle-view');

  if (isFullPageMode) {
    mockup.classList.add('full-mode');
    btn.innerHTML = '<span>📜 Ảnh Full</span>';
    btn.classList.add('active');
  } else {
    mockup.classList.remove('full-mode');
    btn.innerHTML = '<span>📐 Cuộn Phone</span>';
    btn.classList.remove('active');
  }

  selectScreen(activeScreenIndex);
}

// Toggle Figma Multi-Board Grid Mode
function toggleGridMode() {
  isGridMode = !isGridMode;
  const stage = document.getElementById('screen-stage');
  const grid = document.getElementById('grid-view-container');
  const btn = document.getElementById('btn-toggle-grid');
  const presenterBar = document.getElementById('presenterBar');

  if (isGridMode) {
    stage.style.display = 'none';
    grid.style.display = 'grid';
    btn.classList.add('active');
    presenterBar.style.display = 'none';
    renderGrid();
  } else {
    stage.style.display = 'flex';
    grid.style.display = 'none';
    btn.classList.remove('active');
    presenterBar.style.display = 'flex';
  }
}

function renderGrid() {
  const grid = document.getElementById('grid-view-container');
  grid.innerHTML = '';

  const filteredIndices = getFilteredScreenIndices();

  if (filteredIndices.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: var(--bg-panel); border-radius: 20px; border: 1px dashed var(--border-color);">
        <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
        <div style="font-size: 16px; font-weight: 800; color: #F8FAFC; margin-bottom: 6px;">Không tìm thấy màn hình nào</div>
        <div style="font-size: 13px; color: #94A3B8; margin-bottom: 18px;">Không có màn hình nào phù hợp với vai trò hoặc từ khóa tìm kiếm.</div>
        <button class="btn-pill" style="margin: 0 auto;" onclick="setRoleFilter('all'); document.getElementById('screenSearchInput').value=''; handleSearch('');">
          <span>🔄 Xem Toàn Bộ ${SCREENS.length} Màn Hình</span>
        </button>
      </div>
    `;
    return;
  }

  filteredIndices.forEach((idx, order) => {
    const s = SCREENS[idx];
    const roleMeta = ROLE_CONFIG[s.role] || { icon: '📱', label: s.role, short: s.role };
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.onclick = () => {
      selectScreen(idx);
      toggleGridMode();
    };

    const catShort = s.category.split('.')[1] ? s.category.split('.')[1].trim() : s.category;

    card.innerHTML = `
      <div class="grid-card-preview">
        <div class="grid-card-order-tag">#${order + 1}</div>
        <img src="${s.phoneImage}" alt="${s.name}" onerror="this.src='../mobile_v1/${s.phoneImage}'">
      </div>
      <div class="grid-card-body">
        <div class="grid-card-header-tags">
          <span class="role-badge role-${s.role}">${roleMeta.icon} ${roleMeta.label}</span>
          <span class="grid-card-badge">${catShort}</span>
        </div>
        <div class="grid-card-title">${s.name}</div>
        <div class="grid-card-desc">${s.description}</div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Tìm kiếm màn hình
function handleSearch(q) {
  currentSearchQuery = q.trim();
  initSidebar();
  if (isGridMode) {
    renderGrid();
  }
  const filteredIndices = getFilteredScreenIndices();
  const summaryEl = document.getElementById('roleDisplayCount');
  if (summaryEl) {
    const roleMeta = ROLE_CONFIG[currentRoleFilter] || { label: 'Tất cả' };
    summaryEl.innerHTML = `${filteredIndices.length} / ${SCREENS.length} <span style="color: #94A3B8; font-size: 11px; font-weight: normal;">(${roleMeta.label})</span>`;
  }
}

