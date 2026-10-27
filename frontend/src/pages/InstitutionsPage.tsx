import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInstitutions, createInstitution } from '../api/client';
import { Institution } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Building2, Plus, Search, MapPin, Mail, Phone, ArrowRight } from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    institution_id: '',
    name: '',
    region: 'North',
    contact_email: '',
    contact_phone: '',
    address: '',
  });
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getInstitutions({
        search: search || undefined,
        region: region || undefined,
      });
      setInstitutions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, region]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInstitution(formData);
      setShowModal(false);
      setFormData({
        institution_id: '',
        name: '',
        region: 'North',
        contact_email: '',
        contact_phone: '',
        address: '',
      });
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create institution');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Technical Institutions Registry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository of approved institutions, regional affiliations, and active security deposit portfolios.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Register Institution
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by institution name or ID..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700"
        >
          <option value="">All Regions</option>
          <option value="North">North Region</option>
          <option value="West">West Region</option>
          <option value="South">South Region</option>
          <option value="East">East Region</option>
          <option value="Central">Central Region</option>
        </select>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Institution ID</th>
                <th className="py-3.5 px-4">Institution Name</th>
                <th className="py-3.5 px-4">Region</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4 text-center">FDR Deposits</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading institutions...
                  </td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No institutions match the current search filters.
                  </td>
                </tr>
              ) : (
                institutions.map((inst) => (
                  <tr
                    key={inst.id}
                    onClick={() => navigate(`/institutions/${inst.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {inst.institution_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {inst.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {inst.region}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        {inst.contact_email && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {inst.contact_email}
                          </span>
                        )}
                        {inst.contact_phone && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {inst.contact_phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                        {inst.deposit_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inst.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Institution Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Register New Technical Institution
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Add a new university or college to the security deposit regulatory registry.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INST-006"
                    value={formData.institution_id}
                    onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Region *
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="North">North</option>
                    <option value="West">West</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="Central">Central</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Technological University"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="admin@college.ac.in"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="011-XXXXXXXX"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Full campus location address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Institution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
