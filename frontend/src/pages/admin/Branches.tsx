import React, { useState, useEffect } from "react";
import { Loader2, Search, MapPin, Users, Package, AlertTriangle, Clock, X, ChevronRight, Activity, RotateCcw, Building2, Bell, CheckCircle2, UserPlus, Key, Mail, Lock, Copy, Check, Eye, EyeOff } from "lucide-react";
import { branchService } from "../../services/admin/branch.service";
import { employeeService, Employee } from "../../services/admin/employee.service";
interface Branch {
   _id?: string;
   id: string; // branchCode
   branchCode: string;
   name: string;
   address: string;
   image: string;
   status: 'preparing' | 'active' | 'maintenance';
   manager: string;
   managerId?: string;
   contact: string;
   gppNumber?: string;
   gppExpiryDate?: string;
   stats: {
      employees: number;
      totalStock: number;
      lowStock: number;
      expiring: number;
   };
   alerts: {
      id: number;
      type: string;
      item: string;
      current?: number;
      min?: number;
      expiryDate?: string;
      time: string;
   }[];
}

export function Branches() {
   const [searchTerm, setSearchTerm] = useState("");
   const [branches, setBranches] = useState<Branch[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
   const [createdAccount, setCreatedAccount] = useState<{
      email: string;
      password?: string;
      fullName: string;
      branchCode?: string;
      branchName?: string;
   } | null>(null);

   const fetchBranches = async () => {
      try {
         setLoading(true);
         const data = await branchService.getBranches();
         const rawList = Array.isArray(data) ? data : (data?.data || []);
         const mapped = rawList
            .filter((b: any) => Boolean(b))
            .map((b: any) => ({
               ...b,
               id: b.branchCode || b._id || "",
               branchCode: b.branchCode || b.id || "",
               name: b.name || "Chi nhánh chưa đặt tên",
               address: b.address || "Chưa cập nhật địa chỉ",
               image: b.image || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60",
               status: b.status || "active",
               manager: b.manager || "Chưa gán quản lý",
               contact: b.contact || b.phone || "",
               stats: {
                  employees: Number(b.stats?.employees) || 0,
                  totalStock: Number(b.stats?.totalStock) || 0,
                  lowStock: Number(b.stats?.lowStock) || 0,
                  expiring: Number(b.stats?.expiring) || 0,
               },
               alerts: Array.isArray(b.alerts) ? b.alerts : [],
            }));
         setBranches(mapped);
         setError(null);
      } catch (err: any) {
         console.error(err);
         setError(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải dữ liệu");
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchBranches();
   }, []);

   const handleCreate = async (newData: any) => {
      try {
         const created = await branchService.createBranch(newData);
         const mapped = {
            ...created,
            id: created.branchCode,
            stats: created.stats || { employees: 0, totalStock: 0, lowStock: 0, expiring: 0 },
            alerts: Array.isArray(created.alerts) ? created.alerts : [],
         };
         setBranches((prev) => [...prev, mapped]);
         setIsCreateOpen(false);

         // Nếu backend trả về thông tin tài khoản Quản lý chi nhánh vừa cấp mới
         if (created.newManagerAccount) {
            setCreatedAccount({
               ...created.newManagerAccount,
               branchCode: created.branchCode,
               branchName: created.name,
            });
         }
      } catch (err: any) {
         alert(err.response?.data?.message || err.message || "Lỗi khi tạo chi nhánh");
      }
   };

   const handleUpdate = async (id: string, updatedData: any) => {
      try {
         const updated = await branchService.updateBranch(id, updatedData);
         const mapped = {
            ...updated,
            id: updated.branchCode,
         };
         setBranches((prev) => prev.map((b) => (b._id === id ? mapped : b)));
         setEditingBranch(null);

         // Update selected branch detail modal if open
         if (selectedBranch && selectedBranch._id === id) {
            setSelectedBranch(mapped);
         }
      } catch (err: any) {
         alert(err.response?.data?.message || err.message || "Lỗi khi cập nhật chi nhánh");
      }
   };

   const handleDelete = async (id: string) => {
      try {
         await branchService.deleteBranch(id);
         setBranches((prev) => prev.filter((b) => b._id !== id));
         setSelectedBranch(null);
      } catch (err: any) {
         alert(err.response?.data?.message || err.message || "Lỗi khi xóa chi nhánh");
      }
   };

   const searchKey = (searchTerm || "").trim().toLowerCase();
   const filteredBranches = branches.filter((branch) => {
      if (!branch) return false;
      const name = (branch.name || "").toLowerCase();
      const address = (branch.address || "").toLowerCase();
      const code = (branch.branchCode || branch.id || "").toLowerCase();
      const manager = (branch.manager || "").toLowerCase();
      return !searchKey || name.includes(searchKey) || address.includes(searchKey) || code.includes(searchKey) || manager.includes(searchKey);
   });

   return (
      <div className="space-y-6 flex flex-col min-h-full bg-[#faf8ff] p-6 lg:p-8 pb-12">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý chi nhánh</h1>
               <p className="text-slate-500 mt-1">Theo dõi hoạt động và cảnh báo tồn kho của các quầy thuốc.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                     type="text"
                     placeholder="Tìm kiếm chi nhánh, địa chỉ..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all shadow-sm"
                  />
               </div>
               <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
               >
                  <Building2 size={18} />
                  Thêm chi nhánh
               </button>
            </div>
         </div>

         {loading ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
               <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-500">Đang tải danh sách chi nhánh...</p>
               </div>
            </div>
         ) : error ? (
            <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
               <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
               <h3 className="font-bold text-rose-800">Đã xảy ra lỗi</h3>
               <p className="text-rose-600 text-sm mt-1">{error}</p>
               <button
                  onClick={fetchBranches}
                  className="mt-4 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
               >
                  Thử lại
               </button>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredBranches.map(branch => (
                  <div
                     key={branch._id || branch.id}
                     className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
                  >
                     {/* Card Header Media */}
                     <div className="relative h-48 overflow-hidden" onClick={() => setSelectedBranch(branch)}>
                        <img src={branch.image} alt={branch.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 right-3 flex gap-2">
                           <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm backdrop-blur-md ${branch.status === 'active' ? 'bg-sky-500/90 text-white' : 'bg-amber-500/90 text-white'
                              }`}>
                              {branch.status === 'active' ? 'Hoạt động' : 'Bảo trì / Sửa chữa'}
                           </span>
                        </div>
                        {((branch.stats?.lowStock || 0) > 0 || (branch.stats?.expiring || 0) > 0) && (
                           <div className="absolute top-3 left-3 bg-rose-500/90 text-white px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm backdrop-blur-md flex items-center gap-1.5">
                              <Bell size={12} className="animate-pulse" />
                              {(branch.stats?.lowStock || 0) + (branch.stats?.expiring || 0)} Cảnh báo
                           </div>
                        )}
                     </div>

                     {/* Card Body */}
                     <div className="p-5 flex flex-col flex-1">
                        <div className="flex-1" onClick={() => setSelectedBranch(branch)}>
                           <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0057cd] transition-colors line-clamp-1">{branch.name}</h3>
                           <div className="flex items-start gap-2 text-slate-500 mt-2 text-sm">
                              <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                              <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
                           </div>

                           <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 content-end">
                              <div className="flex flex-col">
                                 <span className="text-xs text-slate-500 font-medium font-mono mb-1 flex items-center gap-1"><Users size={12} /> Nhân sự</span>
                                 <span className="font-bold text-slate-800">{branch.stats?.employees ?? 0} người</span>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-xs text-slate-500 font-medium font-mono mb-1 flex items-center gap-1"><Package size={12} /> Tồn kho</span>
                                 <span className="font-bold text-slate-800">{(branch.stats?.totalStock || 0).toLocaleString()} SP</span>
                              </div>
                           </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
                           <button
                              onClick={() => setSelectedBranch(branch)}
                              className="flex-1 py-2.5 text-xs font-bold text-[#0057cd] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
                           >
                              Xem chi tiết
                           </button>
                           <button
                              onClick={() => setEditingBranch(branch)}
                              className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-center border border-slate-150"
                           >
                              Chỉnh sửa
                           </button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}

         {!loading && !error && filteredBranches.length === 0 && (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
               <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
               <h3 className="text-lg font-bold text-slate-700">Không tìm thấy chi nhánh</h3>
               <p className="text-slate-500 mt-1">Thử thay đổi từ khóa tìm kiếm của bạn.</p>
            </div>
         )}

         {selectedBranch && (
            <BranchDetailModal
               branch={selectedBranch}
               onClose={() => setSelectedBranch(null)}
               onDelete={handleDelete}
            />
         )}

         {isCreateOpen && (
            <CreateBranchModal
               onClose={() => setIsCreateOpen(false)}
               onCreate={handleCreate}
            />
         )}

         {editingBranch && (
            <EditBranchModal
               branch={editingBranch}
               onClose={() => setEditingBranch(null)}
               onUpdate={handleUpdate}
            />
         )}

         {createdAccount && (
            <CreatedAccountModal
               account={createdAccount}
               onClose={() => setCreatedAccount(null)}
            />
         )}
      </div>
   );
}

function BranchDetailModal({ branch, onClose, onDelete }: { branch: Branch, onClose: () => void, onDelete: (id: string) => void }) {
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
         <div className="relative bg-[#faf8ff] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden transform transition-all">

            <div className="flex items-center justify-between p-5 lg:p-6 bg-white border-b border-slate-100 shrink-0">
               <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                     <img src={branch.image} alt={branch.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                     <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{branch.name}</h2>
                     <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold">
                        <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${branch.status === 'active' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                           <Activity size={12} />
                           {branch.status === 'active' ? 'Đang hoạt động' : 'Bảo trì'}
                        </span>
                        <span className="text-slate-500 font-mono">{branch.id}</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-2">
                  {branch.status === 'preparing' && (
                     <button
                        onClick={async () => {
                           if (!branch._id) return;
                           if (window.confirm(`Kích hoạt chi nhánh "${branch.name}" chính thức đi vào hoạt động?`)) {
                              try {
                                 await branchService.activateBranch(branch._id);
                                 alert("Kích hoạt chi nhánh thành công!");
                                 window.location.reload();
                              } catch (err: any) {
                                 alert(err?.response?.data?.message || err?.message || "Lỗi khi kích hoạt chi nhánh");
                              }
                           }
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
                     >
                        <CheckCircle2 size={14} /> Kích hoạt mở bán
                     </button>
                  )}
                  <button
                     onClick={() => {
                        if (branch._id && window.confirm("Bạn có chắc chắn muốn xóa chi nhánh này?")) {
                           onDelete(branch._id);
                        }
                     }}
                     className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl text-xs transition-colors border border-rose-100 flex items-center gap-1.5"
                  >
                     Xóa chi nhánh
                  </button>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors self-start">
                     <X size={24} />
                  </button>
               </div>
            </div>

            <div className="overflow-y-auto p-5 lg:p-6 flex flex-col lg:flex-row gap-6">
               <div className="lg:w-1/3 flex flex-col gap-6">
                  {/* Basic Info Details */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                        <MapPin size={18} className="text-[#0057cd]" /> Thông tin cơ bản
                     </h3>
                     <div className="space-y-4 text-sm">
                        <div>
                           <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Địa chỉ</div>
                           <div className="font-medium text-slate-800 leading-relaxed">{branch.address}</div>

                           {/* Dynamic Google Maps Embed Widget */}
                           <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 h-40 relative group shadow-sm">
                              <iframe
                                 title="Google Maps"
                                 width="100%"
                                 height="100%"
                                 style={{ border: 0 }}
                                 loading="lazy"
                                 src={`https://maps.google.com/maps?q=${encodeURIComponent(branch.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                              />
                              <a
                                 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="absolute inset-0 bg-slate-900/10 hover:bg-slate-900/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                              >
                                 <span className="px-3 py-1.5 bg-white text-slate-800 font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5">
                                    Xem trên Google Maps <ChevronRight size={14} />
                                 </span>
                              </a>
                           </div>
                        </div>
                        <div>
                           <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Quản lý trực tiếp</div>
                           <div className="font-medium text-slate-800">{branch.manager}</div>
                        </div>
                        <div>
                           <div className="text-slate-500 uppercase text-[10px] tracking-widest font-bold mb-1">Liên hệ</div>
                           <div className="font-medium text-slate-800">{branch.contact}</div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-[#0057cd]" /> Thống kê hoạt động
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="text-slate-500 text-xs font-semibold mb-1 flex items-center gap-1.5"><Users size={14} /> Nhân sự</div>
                           <div className="text-xl font-black text-slate-900">{branch.stats.employees}</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="text-slate-500 text-xs font-semibold mb-1 flex items-center gap-1.5"><Package size={14} /> SP Tồn kho</div>
                           <div className="text-xl font-black text-slate-900">{branch.stats.totalStock.toLocaleString()}</div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="lg:w-2/3 flex flex-col h-full gap-5">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                     <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                           <AlertTriangle size={18} className="text-amber-500" />
                           Cảnh báo từ hệ thống & quầy
                        </h3>
                        <div className="flex gap-2">
                           <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg">{branch.stats.lowStock} Sắp hết</span>
                           <span className="px-2.5 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-lg">{branch.stats.expiring} Sắp/Đã Hết hạn</span>
                        </div>
                     </div>
                     <div className="p-0 overflow-y-auto max-h-[400px]">
                        {branch.alerts.length > 0 ? (
                           <div className="divide-y divide-slate-100">
                              {branch.alerts.map(alert => (
                                 <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${alert.type === 'low_stock' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                       }`}>
                                       {alert.type === 'low_stock' ? <RotateCcw size={20} /> : <Clock size={20} />}
                                    </div>
                                    <div className="flex-1">
                                       <div className="flex justify-between items-start">
                                          <h4 className="font-bold text-slate-800 text-sm">{alert.item}</h4>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${alert.type === 'low_stock' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                             }`}>
                                             {alert.type === 'low_stock' ? 'Sắp hết' : 'Chú ý HSD'}
                                          </span>
                                       </div>
                                       <div className="mt-1 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 text-xs text-slate-600">
                                          {alert.type === 'low_stock' ? (
                                             <span className="font-medium bg-slate-100 px-2 py-1 rounded">Hiện tại: <span className="text-amber-600 font-bold">{alert.current}</span> / Min: {alert.min}</span>
                                          ) : (
                                             <span className="font-medium bg-slate-100 px-2 py-1 rounded">Ngày hết hạn: <span className="text-rose-600 font-bold">{alert.expiryDate}</span></span>
                                          )}
                                          <span className="flex items-center gap-1 text-slate-400 italic bg-white"><Bell size={12} /> Báo cáo lúc: {alert.time}</span>
                                       </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-[#0057cd] p-1.5 transition-colors">
                                       <ChevronRight size={18} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="p-12 text-center text-slate-500">
                              <CheckCircle2 size={32} className="mx-auto text-sky-400 mb-3" />
                              <p className="font-medium">Không có cảnh báo nào cho chi nhánh này.</p>
                           </div>
                        )}
                     </div>

                     <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                           <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
                           Cronjob hệ thống: Đang chạy (Kiểm tra HSD mỗi 12h)
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

function CreateBranchModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
   const [name, setName] = useState("");
   const [address, setAddress] = useState("");
   const [managerMode, setManagerMode] = useState<"select" | "new">("select");

   // Trạng thái chọn quản lý có sẵn
   const [manager, setManager] = useState("");
   const [managerId, setManagerId] = useState("");
   const [contact, setContact] = useState("");
   const [unassignedManagers, setUnassignedManagers] = useState<Employee[]>([]);
   const [isManualInput, setIsManualInput] = useState(false);

   // Trạng thái cấp tài khoản quản lý mới
   const [newManagerName, setNewManagerName] = useState("");
   const [newManagerEmail, setNewManagerEmail] = useState("");
   const [newManagerPassword, setNewManagerPassword] = useState("123456");
   const [newManagerPhone, setNewManagerPhone] = useState("");
   const [showNewPassword, setShowNewPassword] = useState(false);

   const [status, setStatus] = useState<"preparing" | "active" | "maintenance">("preparing");
   const [gppNumber, setGppNumber] = useState("");
   const [gppExpiryDate, setGppExpiryDate] = useState("");
   const [image, setImage] = useState("");

   useEffect(() => {
      // Tải danh sách các tài khoản có vai trò Quản lý chi nhánh
      employeeService.getEmployees({ role: 'branch' })
         .then((data: any) => {
            const list = Array.isArray(data) ? data : data?.data || [];
            const managersOnly = list.filter((e: any) => e.role === 'branch' || e.role === 'manager');
            setUnassignedManagers(managersOnly);
         })
         .catch((err) => {
            console.error("Failed to load branch managers:", err);
            setIsManualInput(true);
         });
   }, []);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !address.trim()) {
         alert("Vui lòng điền đầy đủ tên và địa chỉ chi nhánh!");
         return;
      }

      if (managerMode === "new") {
         if (!newManagerName.trim()) {
            alert("Vui lòng nhập họ và tên Quản lý mới!");
            return;
         }
         if (!newManagerEmail.trim() || !newManagerEmail.includes("@")) {
            alert("Vui lòng nhập email đăng nhập hợp lệ cho Quản lý mới!");
            return;
         }
         if (!newManagerPassword || newManagerPassword.length < 6) {
            alert("Mật khẩu quản lý phải có ít nhất 6 ký tự!");
            return;
         }
         onCreate({
            name,
            address,
            contact: newManagerPhone.trim() || contact.trim() || undefined,
            status,
            gppNumber: gppNumber.trim() || undefined,
            gppExpiryDate: gppExpiryDate || undefined,
            image: image.trim() || undefined,
            newManager: {
               fullName: newManagerName.trim(),
               email: newManagerEmail.trim().toLowerCase(),
               password: newManagerPassword.trim(),
               phone: newManagerPhone.trim() || undefined,
            },
         });
      } else {
         if (!manager.trim()) {
            alert("Vui lòng chọn hoặc nhập họ tên Quản lý!");
            return;
         }
         if (!contact.trim()) {
            alert("Vui lòng nhập số điện thoại liên hệ chi nhánh!");
            return;
         }
         onCreate({
            name,
            address,
            manager,
            managerId: managerId || undefined,
            contact: contact.trim(),
            status,
            gppNumber: gppNumber.trim() || undefined,
            gppExpiryDate: gppExpiryDate || undefined,
            image: image.trim() || undefined,
         });
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
         <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="text-[#0057cd]" size={22} />
                  Thêm chi nhánh mới
               </h2>
               <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên chi nhánh *</label>
                  <input
                     type="text"
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="Nhập tên chi nhánh (VD: ABC Pharmacy - CN5)"
                     className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Địa chỉ *</label>
                  <input
                     type="text"
                     required
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     placeholder="Địa chỉ chi nhánh..."
                     className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                  />
               </div>

               {/* Chế độ Quản lý chi nhánh: Chọn có sẵn vs Cấp tài khoản mới */}
               <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nhân sự Quản lý chi nhánh *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-3">
                     <button
                        type="button"
                        onClick={() => setManagerMode("select")}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                           managerMode === "select"
                              ? "bg-white text-[#0057cd] shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                        }`}
                     >
                        <Users size={14} />
                        Chọn quản lý có sẵn
                     </button>
                     <button
                        type="button"
                        onClick={() => setManagerMode("new")}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                           managerMode === "new"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                        }`}
                     >
                        <UserPlus size={14} />
                        + Cấp tài khoản mới
                     </button>
                  </div>

                  {managerMode === "new" ? (
                     <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                           <Key size={14} className="text-emerald-600" />
                           Thông tin tài khoản Quản lý cấp mới
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Họ và tên Quản lý *</label>
                              <input
                                 type="text"
                                 required
                                 value={newManagerName}
                                 onChange={(e) => {
                                    setNewManagerName(e.target.value);
                                    setManager(e.target.value);
                                 }}
                                 placeholder="VD: Nguyễn Văn An"
                                 className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Số điện thoại *</label>
                              <input
                                 type="text"
                                 required
                                 value={newManagerPhone}
                                 onChange={(e) => {
                                    setNewManagerPhone(e.target.value);
                                    setContact(e.target.value);
                                 }}
                                 placeholder="VD: 0987654321"
                                 className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Email đăng nhập *</label>
                              <input
                                 type="email"
                                 required
                                 value={newManagerEmail}
                                 onChange={(e) => setNewManagerEmail(e.target.value)}
                                 placeholder="manager.cnX@abcpharmacy.vn"
                                 className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                           </div>
                           <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Mật khẩu đăng nhập *</label>
                              <div className="relative">
                                 <input
                                    type={showNewPassword ? "text" : "password"}
                                    required
                                    value={newManagerPassword}
                                    onChange={(e) => setNewManagerPassword(e.target.value)}
                                    placeholder="Mật khẩu tối thiểu 6 ký tự"
                                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                 >
                                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                 </button>
                              </div>
                           </div>
                        </div>
                        <p className="text-[11px] text-emerald-700 italic">
                           💡 Hệ thống sẽ tự động tạo tài khoản role "branch", gán vào chi nhánh mới và cấp quyền đăng nhập ngay lập tức.
                        </p>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <div className="flex items-center justify-between mb-1.5">
                                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn Quản lý *</label>
                                 <button
                                    type="button"
                                    onClick={() => {
                                       setIsManualInput(!isManualInput);
                                       setManagerId("");
                                    }}
                                    className="text-[11px] font-semibold text-[#0057cd] hover:underline"
                                 >
                                    {isManualInput ? "Chọn danh sách" : "Nhập tay tên"}
                                 </button>
                              </div>
                              {isManualInput || unassignedManagers.length === 0 ? (
                                 <input
                                    type="text"
                                    required
                                    value={manager}
                                    onChange={(e) => setManager(e.target.value)}
                                    placeholder="Nhập họ tên Quản lý..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                                 />
                              ) : (
                                 <select
                                    required
                                    value={managerId}
                                    onChange={(e) => {
                                       const selectedId = e.target.value;
                                       const selectedEmp = unassignedManagers.find(emp => emp._id === selectedId);
                                       if (selectedEmp) {
                                          setManagerId(selectedId);
                                          setManager(selectedEmp.fullName);
                                          setContact(selectedEmp.phone || selectedEmp.phoneNumber || selectedEmp.email || "");
                                       } else {
                                          setManagerId("");
                                          setManager("");
                                          setContact("");
                                       }
                                    }}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white transition-all"
                                 >
                                    <option value="">-- Chọn Quản lý ({unassignedManagers.length} quản lý) --</option>
                                    {unassignedManagers.map(emp => (
                                       <option key={emp._id} value={emp._id}>
                                          {emp.fullName} ({emp.email}){emp.branchId ? ` - [${emp.branchId}]` : ' - [Chưa gán]'}
                                       </option>
                                    ))}
                                 </select>
                              )}
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                              <input
                                 type="text"
                                 required
                                 value={contact}
                                 onChange={(e) => setContact(e.target.value)}
                                 placeholder="Liên hệ chi nhánh..."
                                 className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                              />
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số Giấy Chứng Nhận GPP</label>
                     <input
                        type="text"
                        value={gppNumber}
                        onChange={(e) => setGppNumber(e.target.value)}
                        placeholder="VD: GPP-HN-2026-088"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày Hết Hạn GPP</label>
                     <input
                        type="date"
                        value={gppExpiryDate}
                        onChange={(e) => setGppExpiryDate(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
                     <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white transition-all"
                     >
                        <option value="preparing">Đang chuẩn bị</option>
                        <option value="active">Hoạt động</option>
                        <option value="maintenance">Bảo trì</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình ảnh (URL)</label>
                     <input
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="Tùy chọn..."
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
               </div>
               <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                     type="button"
                     onClick={onClose}
                     className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                  >
                     Hủy
                  </button>
                  <button
                     type="submit"
                     className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl text-sm hover:bg-[#00419e] transition-colors flex items-center gap-2"
                  >
                     <Building2 size={16} />
                     Lưu chi nhánh
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

function EditBranchModal({ branch, onClose, onUpdate }: { branch: Branch; onClose: () => void; onUpdate: (id: string, data: any) => void }) {
   const [name, setName] = useState(branch.name);
   const [address, setAddress] = useState(branch.address);
   const [manager, setManager] = useState(branch.manager);
   const [managerId, setManagerId] = useState(branch.managerId || "");
   const [contact, setContact] = useState(branch.contact);
   const [status, setStatus] = useState<"active" | "maintenance" | "preparing">(branch.status);
   const [gppNumber, setGppNumber] = useState(branch.gppNumber || "");
   const [gppExpiryDate, setGppExpiryDate] = useState(branch.gppExpiryDate || "");
   const [image, setImage] = useState(branch.image);
   const [managers, setManagers] = useState<Employee[]>([]);
   const [isManualInput, setIsManualInput] = useState(false);

   useEffect(() => {
      // Tải danh sách quản lý để cho phép phân công lại
      employeeService.getEmployees({ role: 'branch' })
         .then((data: any) => {
            const list = Array.isArray(data) ? data : data?.data || [];
            const managersOnly = list.filter((e: any) => e.role === 'branch' || e.role === 'manager');
            setManagers(managersOnly);
         })
         .catch((err) => {
            console.error("Failed to load branch managers for edit:", err);
            setIsManualInput(true);
         });
   }, []);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !address.trim() || !manager.trim() || !contact.trim()) {
         alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
         return;
      }
      if (branch._id) {
         onUpdate(branch._id, {
            name,
            address,
            manager,
            managerId: managerId || undefined,
            contact,
            status,
            gppNumber: gppNumber.trim() || undefined,
            gppExpiryDate: gppExpiryDate || undefined,
            image,
         });
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
         <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="text-[#0057cd]" size={22} />
                  Chỉnh sửa thông tin chi nhánh
               </h2>
               <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên chi nhánh *</label>
                  <input
                     type="text"
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Địa chỉ *</label>
                  <input
                     type="text"
                     required
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Quản lý *</label>
                        <button
                           type="button"
                           onClick={() => {
                              setIsManualInput(!isManualInput);
                              setManagerId("");
                           }}
                           className="text-[11px] font-semibold text-[#0057cd] hover:underline"
                        >
                           {isManualInput ? "Chọn danh sách" : "Nhập tay tên"}
                        </button>
                     </div>
                     {isManualInput || managers.length === 0 ? (
                        <input
                           type="text"
                           required
                           value={manager}
                           onChange={(e) => setManager(e.target.value)}
                           className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                        />
                     ) : (
                        <select
                           value={managerId}
                           onChange={(e) => {
                              const selectedId = e.target.value;
                              const selectedEmp = managers.find(emp => emp._id === selectedId);
                              if (selectedEmp) {
                                 setManagerId(selectedId);
                                 setManager(selectedEmp.fullName);
                                 if (selectedEmp.phone || selectedEmp.phoneNumber) {
                                    setContact(selectedEmp.phone || selectedEmp.phoneNumber || "");
                                 }
                              } else {
                                 setManagerId("");
                              }
                           }}
                           className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white transition-all"
                        >
                           <option value="">-- {manager ? `Hiện tại: ${manager}` : 'Chọn Quản lý'} --</option>
                           {managers.map(emp => (
                              <option key={emp._id} value={emp._id}>
                                 {emp.fullName} ({emp.email}){emp.branchId ? ` - [${emp.branchId}]` : ' - [Chưa gán]'}
                              </option>
                           ))}
                        </select>
                     )}
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                     <input
                        type="text"
                        required
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số Giấy Chứng Nhận GPP</label>
                     <input
                        type="text"
                        value={gppNumber}
                        onChange={(e) => setGppNumber(e.target.value)}
                        placeholder="VD: GPP-HN-2026-088"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày Hết Hạn GPP</label>
                     <input
                        type="date"
                        value={gppExpiryDate}
                        onChange={(e) => setGppExpiryDate(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
                     <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white transition-all"
                     >
                        <option value="preparing">Đang chuẩn bị</option>
                        <option value="active">Hoạt động</option>
                        <option value="maintenance">Bảo trì</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình ảnh (URL)</label>
                     <input
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                     />
                  </div>
               </div>
               <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                     type="button"
                     onClick={onClose}
                     className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                  >
                     Hủy
                  </button>
                  <button
                     type="submit"
                     className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl text-sm hover:bg-[#00419e] transition-colors"
                  >
                     Cập nhật
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

function CreatedAccountModal({
   account,
   onClose,
}: {
   account: {
      email: string;
      password?: string;
      fullName: string;
      branchCode?: string;
      branchName?: string;
   };
   onClose: () => void;
}) {
   const [copied, setCopied] = useState(false);

   const copyCredentials = () => {
      const text = `HỆ THỐNG ABC PHARMACY - THÔNG TIN TÀI KHOẢN QUẢN LÝ CHI NHÁNH
Chi nhánh: ${account.branchName || ''} (${account.branchCode || ''})
Họ và tên: ${account.fullName}
Email đăng nhập: ${account.email}
Mật khẩu: ${account.password || '123456'}
Đăng nhập tại: ${window.location.origin}/login`;

      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
         <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-emerald-100">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative">
               <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-3 backdrop-blur-md">
                  <UserPlus size={32} className="text-white" />
               </div>
               <h3 className="text-xl font-bold">Cấp tài khoản Quản lý thành công!</h3>
               <p className="text-emerald-100 text-xs mt-1">
                  Đã tự động liên kết tài khoản với chi nhánh {account.branchCode}
               </p>
            </div>

            <div className="p-6 space-y-4">
               <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div>
                     <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Chi nhánh quản lý</span>
                     <p className="text-sm font-bold text-slate-800">{account.branchName} ({account.branchCode})</p>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div>
                     <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Họ và tên Quản lý</span>
                     <p className="text-sm font-semibold text-slate-800">{account.fullName}</p>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div>
                     <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email đăng nhập</span>
                     <p className="text-sm font-mono font-bold text-[#0057cd] select-all">{account.email}</p>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div>
                     <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mật khẩu đăng nhập</span>
                     <p className="text-sm font-mono font-bold text-emerald-600 select-all">{account.password || '123456'}</p>
                  </div>
               </div>

               <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                     <b>Cách đăng nhập:</b> Truy cập trang <b>/login</b>, nhập Email & Mật khẩu trên. Hệ thống sẽ tự động chuyển hướng vào màn hình làm việc của chi nhánh <b>{account.branchCode}</b>.
                  </div>
               </div>

               <div className="flex gap-3 pt-2">
                  <button
                     type="button"
                     onClick={copyCredentials}
                     className="flex-1 py-2.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-emerald-200"
                  >
                     {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                     {copied ? "Đã sao chép!" : "Sao chép thông tin"}
                  </button>
                  <button
                     type="button"
                     onClick={onClose}
                     className="flex-1 py-2.5 px-4 bg-[#0057cd] text-white hover:bg-[#00419e] font-bold rounded-xl text-sm transition-all"
                  >
                     Đã hiểu
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
