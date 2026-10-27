import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDeposit,
  getDepositPassport,
  getDepositChain,
  listDepositDocuments,
  uploadDocument,
  extractFields,
  runConsistencyCheck,
  runVerification,
  getVerificationHistory,
  getTrustLadder,
  getDepositAudit,
  createReplacement,
  createRelease,
  confirmHumanScrutiny,
} from '../api/client';
import {
  Deposit,
  PassportEvent,
  ChainNode,
  DocumentItem,
  ExtractedField,
  ConsistencyResult,
  VerificationEvent,
  TrustLadder as TrustLadderType,
  AuditEvent,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TrustLadder } from '../components/TrustLadder';
import { LifecyclePassport } from '../components/LifecyclePassport';
import { ReplacementChain } from '../components/ReplacementChain';
import { MismatchMap } from '../components/MismatchMap';
import { AuditTimeline } from '../components/AuditTimeline';
import {
  Landmark,
  ShieldCheck,
  History,
  FileText,
  FileCheck2,
  GitBranch,
  ScrollText,
  Upload,
  Play,
  ArrowRightCircle,
  PlusCircle,
  ArrowLeft,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Download,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export const DepositDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'passport' | 'trust_ladder' | 'documents' | 'verification' | 'chain' | 'audit'
  >('overview');

  const [passportEvents, setPassportEvents] = useState<PassportEvent[]>([]);
  const [chainNodes, setChainNodes] = useState<ChainNode[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [consistencyResults, setConsistencyResults] = useState<ConsistencyResult[]>([]);
  const [verifications, setVerifications] = useState<VerificationEvent[]>([]);
  const [trustLadder, setTrustLadder] = useState<TrustLadderType | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('FDR_RECEIPT');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractingDocId, setExtractingDocId] = useState<number | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

  // Replacement modal state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceData, setReplaceData] = useState({
    amount: 1000000,
    bank_name: 'State Bank of India',
    branch_name: '',
    receipt_no: '',
    account_holder: '',
    issue_date: new Date().toISOString().split('T')[0],
    maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const { user } = useAuth();
  const [showHumanModal, setShowHumanModal] = useState(false);
  const [humanRemarks, setHumanRemarks] = useState('');
  const [certifyingHuman, setCertifyingHuman] = useState(false);

  const navigate = useNavigate();

  const loadAll = async () => {
    if (!id) return;
    const depId = parseInt(id, 10);
    setLoading(true);
    try {
      const dep = await getDeposit(depId);
      setDeposit(dep);

      // Load all tab data in parallel
      const [pass, ch, docs, verifs, tl, aud] = await Promise.all([
        getDepositPassport(depId).catch(() => []),
        getDepositChain(depId).catch(() => []),
        listDepositDocuments(depId).catch(() => []),
        getVerificationHistory(depId).catch(() => []),
        getTrustLadder(depId).catch(() => null),
        getDepositAudit(dep.deposit_id).catch(() => []),
      ]);

      setPassportEvents(pass);
      setChainNodes(ch);
      setDocuments(docs);
      setVerifications(verifs);
      setTrustLadder(tl);
      setAuditEvents(aud);

      // Consistency check
      const cons = await runConsistencyCheck(depId).catch(() => []);
      setConsistencyResults(cons);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deposit || !uploadFile) return;
    setUploading(true);
    try {
      const doc = await uploadDocument(deposit.id, uploadDocType, uploadFile);
      setNotice(`Document "${doc.file_name}" uploaded successfully with SHA-256 integrity hash!`);
      setShowUploadModal(false);
      setUploadFile(null);
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async (docId: number) => {
    if (extractingDocId !== null) return;
    setExtractingDocId(docId);
    try {
      const res = await extractFields(docId);
      setNotice(`OCR Extraction Successful: ${res.message}. Consistency engine re-evaluated.`);
      await loadAll();
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Extraction failed';
      alert(`OCR Extraction: ${errMsg}`);
    } finally {
      setExtractingDocId(null);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      setDownloadingDocId(doc.id);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name || `document_${doc.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const token = localStorage.getItem('token');
      const fallbackUrl = `/api/documents/${doc.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleRunVerification = async () => {
    if (!deposit) return;
    try {
      const res = await runVerification(deposit.id);
      setNotice(`Bank Sandbox Verification Completed: Status is ${res.status}. Recorded in Lifecycle Passport.`);
      await loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Verification run failed');
    }
  };

  const handleCreateReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deposit) return;
    try {
      const newDep = await createReplacement(deposit.id, {
        ...replaceData,
        institution_id: deposit.institution_id,
      });
      setShowReplaceModal(false);
      setNotice(`Replacement FDR ${newDep.deposit_id} registered. Old instrument marked as REPLACED.`);
      navigate(`/deposits/${newDep.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create replacement');
    }
  };

  const handleInitiateRelease = async () => {
    if (!deposit) return;
    try {
      const rel = await createRelease(deposit.id);
      navigate(`/releases/${rel.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to initiate release request');
    }
  };

  const handleConfirmHumanScrutiny = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deposit || !humanRemarks.trim()) return;
    setCertifyingHuman(true);
    try {
      const updatedLadder = await confirmHumanScrutiny(deposit.id, humanRemarks.trim());
      setTrustLadder(updatedLadder);
      const vHistory = await getVerificationHistory(deposit.id);
      setVerifications(vHistory);
      const pass = await getDepositPassport(deposit.id);
      setPassportEvents(pass);
      setNotice('Scrutiny Officer Human Clearance formally recorded and certified!');
      setShowHumanModal(false);
      setHumanRemarks('');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to record human scrutiny clearance');
    } finally {
      setCertifyingHuman(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading && !deposit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Deposit record not found.
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview & Terms', icon: Landmark },
    { key: 'passport', label: 'Lifecycle Passport', icon: History, count: passportEvents.length },
    { key: 'trust_ladder', label: 'Trust Ladder', icon: ShieldCheck },
    { key: 'documents', label: 'Documents & OCR', icon: FileText, count: documents.length },
    { key: 'verification', label: 'Bank Verification', icon: FileCheck2, count: verifications.length },
    { key: 'chain', label: 'Replacement Chain', icon: GitBranch, count: chainNodes.length },
    { key: 'audit', label: 'Audit Trail', icon: ScrollText, count: auditEvents.length },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/deposits')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Registry
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" /> Upload Document
          </button>

          <button
            onClick={handleRunVerification}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Bank Verification (Sandbox)
          </button>

          <button
            onClick={handleInitiateRelease}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" /> Release Request
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-indigo-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-indigo-500/20 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {deposit.deposit_id}
                </span>
                <StatusBadge status={deposit.lifecycle_status} />
                <StatusBadge status={deposit.trust_level} />
              </div>

              <h1 className="text-xl font-black text-slate-900 mt-1">
                {formatCurrency(deposit.amount)} — {deposit.bank_name}
              </h1>

              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {deposit.institution_name} • Receipt #{deposit.receipt_no || 'N/A'}
              </p>
            </div>
          </div>

          {/* Maturity Status Pill */}
          <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Maturity Milestone
            </span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {deposit.maturity_date ? format(new Date(deposit.maturity_date), 'dd MMMM yyyy') : 'N/A'}
            </div>
            <div className="text-xs font-semibold mt-0.5">
              {deposit.days_to_maturity > 0 ? (
                <span className={deposit.days_to_maturity <= 30 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                  {deposit.days_to_maturity} days remaining
                </span>
              ) : (
                <span className="text-rose-600 font-bold">Matured</span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 mt-6 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              Financial & Instrument Metadata
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Deposit Amount</span>
                <span className="text-base font-black text-slate-900">{formatCurrency(deposit.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Receipt Number</span>
                <span className="font-mono font-bold text-slate-800">{deposit.receipt_no || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Issuing Bank</span>
                <span className="font-bold text-slate-800">{deposit.bank_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Branch Name</span>
                <span className="text-slate-700">{deposit.branch_name || 'Main Branch'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Account Holder</span>
                <span className="text-slate-800 font-medium">{deposit.account_holder || 'Not specified'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Validity & Administrative Timeline
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Issue Date</span>
                <span className="font-bold text-slate-800">
                  {deposit.issue_date ? format(new Date(deposit.issue_date), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Maturity Date</span>
                <span className="font-bold text-slate-800">
                  {deposit.maturity_date ? format(new Date(deposit.maturity_date), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Registered By</span>
                <span className="text-slate-700">{deposit.created_by || 'System Admin'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Created At</span>
                <span className="text-slate-700">
                  {deposit.created_at ? format(new Date(deposit.created_at), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Associated Institution: <strong>{deposit.institution_name}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIFECYCLE PASSPORT TAB (CORE USP 1) */}
      {activeTab === 'passport' && (
        <LifecyclePassport events={passportEvents} />
      )}

      {/* 3. TRUST LADDER TAB (CORE USP 2) */}
      {activeTab === 'trust_ladder' && trustLadder && (
        <TrustLadder
          data={trustLadder}
          canConfirmHuman={user?.role !== 'INSTITUTION'}
          onConfirmHuman={() => setShowHumanModal(true)}
        />
      )}

      {/* 4. DOCUMENTS & OCR TAB (USP 5 & 6) */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Uploaded Documents & Digital Scans
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every uploaded file receives a SHA-256 integrity hash to detect post-ingestion tampering.
                </p>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No documents uploaded for this FDR yet. Upload the official receipt scan to trigger OCR extraction.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{doc.file_name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-indigo-600">{doc.document_type}</span>
                          <span>•</span>
                          <span className="font-mono">SHA-256: {doc.file_hash ? `${doc.file_hash.slice(0, 16)}...` : 'None'}</span>
                          <span>•</span>
                          <span>{doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExtract(doc.id)}
                        disabled={extractingDocId !== null}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                      >
                        {extractingDocId === doc.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span>Running OCR...</span>
                          </>
                        ) : (
                          'Run OCR Extraction'
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingDocId === doc.id}
                        title={`Download ${doc.file_name}`}
                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {downloadingDocId === doc.id ? (
                          <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mismatch Map Section */}
          <MismatchMap results={consistencyResults} />
        </div>
      )}

      {/* 5. VERIFICATION TAB (SAFE BANK CONNECTOR SANDBOX) */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                Authorized Bank Verification Connector (Sandbox)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Independent source confirmation mechanism. Clearly distinguishes institution-submitted records from bank responses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunVerification}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Execute Bank Check
              </button>

              {user?.role !== 'INSTITUTION' && (
                <button
                  onClick={() => setShowHumanModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 shadow-xs cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Certify Human Scrutiny
                </button>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            <strong>Bank Integration Sandbox:</strong> Direct Core Banking System (CBS) integration operates in authorized regulatory simulation mode in this environment.
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Checked At</th>
                  <th className="py-3 px-4">Verification Source</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4 text-center">Outcome</th>
                  <th className="py-3 px-4">Observations / Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No verification checks executed yet. Click &quot;Execute Bank Check&quot; above.
                    </td>
                  </tr>
                ) : (
                  verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500">
                        {v.checked_at ? format(new Date(v.checked_at), 'dd MMM yyyy, HH:mm') : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {v.source}
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-700">
                        {v.response_reference || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {v.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. REPLACEMENT CHAIN TAB (USP 4) */}
      {activeTab === 'chain' && (
        <ReplacementChain
          chain={chainNodes}
          canReplace={true}
          onOpenReplaceModal={() => {
            setReplaceData({
              amount: deposit.amount,
              bank_name: deposit.bank_name,
              branch_name: deposit.branch_name || '',
              receipt_no: '',
              account_holder: deposit.account_holder || '',
              issue_date: new Date().toISOString().split('T')[0],
              maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
            setShowReplaceModal(true);
          }}
        />
      )}

      {/* 7. AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <AuditTimeline events={auditEvents} />
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Upload Supporting Instrument Document
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Upload an official scan (PDF or image). The system will compute a SHA-256 hash for tamper tracking.
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Type
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="FDR_RECEIPT">FDR Receipt Scan</option>
                  <option value="AFFIDAVIT">Affidavit on Stamp Paper</option>
                  <option value="APPROVAL_LETTER">AICTE Approval Letter / EoA</option>
                  <option value="REQUEST_LETTER">Institution Request Letter</option>
                  <option value="PAYMENT_PROOF">Bank Deposit Transfer Proof</option>
                  <option value="OTHER">Other Regulatory Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Upload & Hash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replacement FDR Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Issue Replacement FDR Instrument
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Links a new FDR to this record. The predecessor instrument will transition to <strong>REPLACED</strong> while maintaining full audit lineage.
            </p>

            <form onSubmit={handleCreateReplacement} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={replaceData.amount}
                    onChange={(e) => setReplaceData({ ...replaceData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Receipt Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBI-RENEW-99"
                    value={replaceData.receipt_no}
                    onChange={(e) => setReplaceData({ ...replaceData, receipt_no: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={replaceData.bank_name}
                    onChange={(e) => setReplaceData({ ...replaceData, bank_name: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={replaceData.branch_name}
                    onChange={(e) => setReplaceData({ ...replaceData, branch_name: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={replaceData.issue_date}
                    onChange={(e) => setReplaceData({ ...replaceData, issue_date: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Maturity Date
                  </label>
                  <input
                    type="date"
                    required
                    value={replaceData.maturity_date}
                    onChange={(e) => setReplaceData({ ...replaceData, maturity_date: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReplaceModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Create Linked Replacement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Human Scrutiny Certification Modal (Trust Ladder Level 6) */}
      {showHumanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Scrutiny Officer Human Clearance Certification
                </h2>
                <p className="text-xs text-slate-500">
                  Step 6: Official Human Scrutiny on FDR #{deposit.deposit_id}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 mb-4 border border-slate-200">
              <p>
                <strong>Institutional Governance Mandate:</strong> In accordance with regulatory procedures, final clearance requires an authorized official to review physical/scanned evidence, verify receipt details against bank records, and document an official remark.
              </p>
            </div>

            <form onSubmit={handleConfirmHumanScrutiny} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Scrutiny Remarks & Clearance Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={humanRemarks}
                  onChange={(e) => setHumanRemarks(e.target.value)}
                  placeholder="e.g. Scrutinized original FDR scan against bank branch confirmation. Amount ₹10,00,000 and pledge terms verified compliant."
                  className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHumanModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={certifyingHuman || !humanRemarks.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {certifyingHuman ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Certify Clearance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
