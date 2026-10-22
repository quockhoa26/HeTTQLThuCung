import React, { useEffect, useState } from 'react';
import {
  Dog,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.js';
import { Pet, Customer } from '../types/index.js';
import { Modal } from '../components/Modal.js';

interface PetsPageProps {
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const PetsPage: React.FC<PetsPageProps> = ({ onNotify }) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    petCode: '',
    name: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực' as 'Đực' | 'Cái',
    birthDate: '',
    weight: '',
    furColor: '',
    healthStatus: 'Bình thường',
    imageUrl: '',
    notes: '',
    customerId: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPets = async () => {
    setLoading(true);
    try {
      const res = await api.getPets({
        search,
        species: speciesFilter,
        page,
        limit: 10,
      });
      if (res.success) {
        setPets(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể tải danh sách thú cưng');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.getCustomers({ limit: 100 });
      if (res.success) {
        setCustomers(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPets();
  }, [search, speciesFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({
      petCode: '',
      name: '',
      species: 'Chó',
      breed: '',
      gender: 'Đực',
      birthDate: '',
      weight: '',
      furColor: '',
      healthStatus: 'Khỏe mạnh, bình thường',
      imageUrl: '',
      notes: '',
      customerId: customers[0]?.id || 0,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (pet: Pet) => {
    setIsEditing(true);
    setSelectedPet(pet);
    setFormData({
      petCode: pet.pet_code,
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      gender: pet.gender,
      birthDate: pet.birth_date ? pet.birth_date.slice(0, 10) : '',
      weight: pet.weight ? pet.weight.toString() : '',
      furColor: pet.fur_color || '',
      healthStatus: pet.health_status || '',
      imageUrl: pet.image_url || '',
      notes: pet.notes || '',
      customerId: pet.customer_id || 0,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openDetailModal = async (pet: Pet) => {
    try {
      const res = await api.getPetById(pet.id);
      if (res.success) {
        setSelectedPet(res.data);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể lấy thông tin chi tiết thú cưng');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên thú cưng');
      return;
    }
    if (!formData.customerId) {
      setFormError('Vui lòng chọn chủ sở hữu (khách hàng)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        petCode: formData.petCode.trim() || undefined,
        name: formData.name.trim(),
        species: formData.species,
        breed: formData.breed.trim() || undefined,
        gender: formData.gender,
        birthDate: formData.birthDate || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        furColor: formData.furColor.trim() || undefined,
        healthStatus: formData.healthStatus.trim() || 'Bình thường',
        imageUrl: formData.imageUrl.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        customerId: Number(formData.customerId),
      };

      if (isEditing && selectedPet) {
        await api.updatePet(selectedPet.id, payload);
        onNotify('success', `Cập nhật thông tin bé ${payload.name} thành công`);
      } else {
        await api.createPet(payload);
        onNotify('success', `Thêm mới thú cưng ${payload.name} thành công`);
      }

      setIsFormOpen(false);
      fetchPets();
    } catch (err: any) {
      setFormError(err.message || 'Đã xảy ra lỗi khi lưu thông tin thú cưng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pet: Pet) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ thú cưng [${pet.name} (${pet.pet_code})] không? Thao tác này không thể hoàn tác!`)) {
      return;
    }

    try {
      await api.deletePet(pet.id);
      onNotify('success', `Đã xóa thú cưng ${pet.name}`);
      fetchPets();
    } catch (err: any) {
      onNotify('error', err.message || 'Không thể xóa thú cưng');
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className="search-input-wrap">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Tìm kiếm theo tên, mã thú cưng, giống, chủ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={speciesFilter}
              onChange={(e) => {
                setSpeciesFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả loài</option>
              <option value="Chó">Chó</option>
              <option value="Mèo">Mèo</option>
              <option value="Chim">Chim</option>
              <option value="Cá">Cá</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Thêm Thú Cưng Mới
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên thú cưng</th>
              <th>Loài / Giống</th>
              <th>Giới tính</th>
              <th>Cân nặng</th>
              <th>Tình trạng sức khỏe</th>
              <th>Chủ sở hữu</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách thú cưng...
                </td>
              </tr>
            ) : pets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Dog size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div>Không tìm thấy thú cưng nào phù hợp</div>
                </td>
              </tr>
            ) : (
              pets.map((pet) => (
                <tr key={pet.id}>
                  <td><span className="badge badge-neutral">{pet.pet_code}</span></td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{pet.name}</div>
                    <small style={{ color: 'var(--text-muted)' }}>Màu lông: {pet.fur_color || 'Không ghi'}</small>
                  </td>
                  <td>
                    <div>
                      {pet.species === 'Chó' ? '🐶 ' : pet.species === 'Mèo' ? '🐱 ' : pet.species === 'Chim' ? '🦜 ' : pet.species === 'Cá' ? '🐠 ' : '🐾 '}
                      {pet.species}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{pet.breed || 'Chưa rõ giống'}</small>
                  </td>
                  <td>
                    <span className={`badge ${pet.gender === 'Đực' ? 'badge-info' : 'badge-warning'}`}>
                      {pet.gender}
                    </span>
                  </td>
                  <td>{pet.weight ? `${pet.weight} kg` : '-'}</td>
                  <td>
                    <span className="badge badge-success">{pet.health_status || 'Bình thường'}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{pet.customer_name}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{pet.customer_phone}</small>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-outline btn-icon btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Xem chi tiết & Lịch sử"
                      onClick={() => openDetailModal(pet)}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      className="btn btn-outline btn-icon btn-sm"
                      style={{ marginRight: '6px' }}
                      title="Chỉnh sửa"
                      onClick={() => openEditModal(pet)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      title="Xóa"
                      onClick={() => handleDelete(pet)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trang trước
          </button>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Trang {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Modal Create/Edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Chỉnh sửa thú cưng: ${formData.name}` : 'Thêm Thú Cưng Mới'}
        maxWidth="680px"
      >
        {formError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tên thú cưng (*)</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="VD: LuLu, Miu Miu..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mã thú cưng (Tự sinh nếu trống)</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: PET001..."
                value={formData.petCode}
                onChange={(e) => setFormData({ ...formData, petCode: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Loài (*)</label>
              <select
                className="form-select"
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              >
                <option value="Chó">Chó</option>
                <option value="Mèo">Mèo</option>
                <option value="Chim">Chim</option>
                <option value="Cá">Cá</option>
                <option value="Thỏ">Thỏ</option>
                <option value="Hamster">Hamster</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giống loài</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Poodle, Golden, Mèo Anh..."
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Giới tính</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              >
                <option value="Đực">Đực</option>
                <option value="Cái">Cái</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cân nặng (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="form-input"
                placeholder="VD: 4.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ngày sinh</label>
              <input
                type="date"
                className="form-input"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Màu lông</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Nâu đỏ, Vàng kem, Trắng..."
                value={formData.furColor}
                onChange={(e) => setFormData({ ...formData, furColor: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tình trạng sức khỏe</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Khỏe mạnh, đã tiêm phòng..."
                value={formData.healthStatus}
                onChange={(e) => setFormData({ ...formData, healthStatus: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chủ sở hữu (Khách hàng) (*)</label>
            <select
              className="form-select"
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: parseInt(e.target.value, 10) })}
            >
              <option value="0">-- Chọn khách hàng sở hữu --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú thêm</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="VD: Nhút nhát với người lạ, dị ứng sữa..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail & History */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Hồ sơ chi tiết thú cưng: ${selectedPet?.name}`}
        maxWidth="680px"
      >
        {selectedPet && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-subtle)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <div><strong>Mã thú cưng:</strong> {selectedPet.pet_code}</div>
              <div><strong>Loài / Giống:</strong> {selectedPet.species} ({selectedPet.breed || 'Chưa rõ'})</div>
              <div><strong>Giới tính:</strong> {selectedPet.gender}</div>
              <div><strong>Cân nặng:</strong> {selectedPet.weight ? `${selectedPet.weight} kg` : 'Chưa cập nhật'}</div>
              <div><strong>Màu lông:</strong> {selectedPet.fur_color || 'Chưa ghi nhận'}</div>
              <div><strong>Tình trạng sức khỏe:</strong> {selectedPet.health_status}</div>
              <div><strong>Chủ sở hữu:</strong> {selectedPet.customer_name}</div>
              <div><strong>SĐT liên hệ:</strong> {selectedPet.customer_phone}</div>
            </div>

            {selectedPet.notes && (
              <div style={{ marginBottom: '20px' }}>
                <strong>Ghi chú:</strong>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{selectedPet.notes}</p>
              </div>
            )}

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--primary)" />
              Lịch sử các lần đặt dịch vụ:
            </h4>

            {selectedPet.appointments && selectedPet.appointments.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã lịch</th>
                      <th>Ngày hẹn</th>
                      <th>Nhân viên phụ trách</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPet.appointments.map((apt) => (
                      <tr key={apt.id}>
                        <td><strong>{apt.appointment_code}</strong></td>
                        <td>{new Date(apt.appointment_date).toLocaleString('vi-VN')}</td>
                        <td>{apt.staff_name || 'Chưa phân công'}</td>
                        <td><span className="badge badge-info">{apt.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Bé chưa có lịch sử đặt dịch vụ nào trong hệ thống.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
