import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Settings,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  RefreshCw,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useApi } from './hooks/useApi';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569', '#f97316'];

const MAIN_TYPES = [
  "Income",
  "Fixed Expenses",
  "Living Expenses",
  "Family and Personal",
  "Debt",
  "Savings",
  "Investments",
  "Miscellaneous",
  "Lifestyle Upgrade",
  "Transfer"
];

const TARGET_CATEGORIES = MAIN_TYPES;

const App = () => {
  const [view, setView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState({ Income: [], Expense: [] });
  const [isModalOpen, setIsModalOpen] = useState(null); // 'expense', 'category', 'settings'
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const { call, loading, scriptUrl } = useApi();

  const refreshData = async () => {
    if (!scriptUrl) return;
    const [expData, catData] = await Promise.all([
      call({ type: 'expenses' }),
      call({ type: 'categories' })
    ]);
    if (expData) setExpenses(expData);
    if (catData) setCategories(catData);
  };

  useEffect(() => {
    if (scriptUrl) refreshData();
  }, []);

  const availableMonths = useMemo(() => {
    const months = expenses.map(e => {
      const date = new Date(e.Date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    const unique = [...new Set(months)].sort().reverse();
    return ['All', ...unique];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (selectedMonth === 'All') return expenses;
    return expenses.filter(e => {
      const date = new Date(e.Date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthStr === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  const stats = useMemo(() => {
    const income = filteredExpenses
      .filter(e => e.Type === 'Income')
      .reduce((sum, e) => sum + Number(e.Amount || 0), 0);
    const expense = filteredExpenses
      .filter(e => e.Type !== 'Income' && e.Type !== 'Transfer')
      .reduce((sum, e) => sum + Number(e.Amount || 0), 0);
    return { income, expense, balance: income - expense };
  }, [filteredExpenses]);

  const chartData = useMemo(() => {
    const process = (type) => {
      const grouped = filteredExpenses
        .filter(e => e.Type === type)
        .reduce((acc, e) => {
          acc[e.Category] = (acc[e.Category] || 0) + Number(e.Amount || 0);
          return acc;
        }, {});
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    };
    return { income: process('Income'), expense: process('Expense') };
  }, [filteredExpenses]);

  const categorySummary = useMemo(() => {
    const summary = TARGET_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = { income: 0, expense: 0 };
      return acc;
    }, {});

    filteredExpenses.forEach(e => {
      const eType = (e.Type || '').trim().toLowerCase();
      const match = MAIN_TYPES.find(mt => mt.trim().toLowerCase() === eType);

      if (match) {
        if (match === "Income") summary[match].income += Number(e.Amount || 0);
        else if (match !== "Transfer") summary[match].expense += Number(e.Amount || 0);
      } else {
        if (!summary["Miscellaneous"]) summary["Miscellaneous"] = { income: 0, expense: 0 };
        summary["Miscellaneous"].expense += Number(e.Amount || 0);
      }
    });

    return Object.entries(summary).map(([name, values]) => ({ name, ...values }));
  }, [filteredExpenses]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR'
  }).format(val);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const TransactionList = ({ transactions, onDelete, onEdit, showActions = false }) => {
    return (
      <>
        {/* Desktop Table */}
        <div className="table-container mobile-hide">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {showActions && <th>Type</th>}
                <th>Category</th>
                <th>Amount</th>
                <th>Mode</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.map((exp, i) => (
                <tr key={exp.ID || i}>
                  <td>{formatDate(exp.Date)}</td>
                  {showActions && <td>{exp.Type}</td>}
                  <td>
                    <span className={`badge ${exp.Type === 'Income' ? 'badge-income' : 'badge-expense'}`}>
                      {exp.Category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(exp.Amount)}</td>
                  <td>{exp.PaymentMode}</td>
                  {showActions && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => onEdit(exp)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => onDelete(exp.ID)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="transaction-cards">
          {transactions.map((exp, i) => (
            <div key={exp.ID || i} className="transaction-card">
              <div className="t-card-left">
                <span className="t-card-date">{formatDate(exp.Date)}</span>
                <span className="t-card-category" style={{ color: exp.Type === 'Income' ? 'var(--income)' : 'var(--text-main)' }}>
                  {exp.Category}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="t-card-right">
                  <span className="t-card-amount" style={{ color: exp.Type === 'Income' ? 'var(--income)' : 'var(--expense)' }}>
                    {formatCurrency(exp.Amount)}
                  </span>
                  <span className="t-card-mode">{exp.PaymentMode}</span>
                </div>
                {showActions && (
                  <div className="t-card-actions">
                    <button className="btn btn-outline" style={{ padding: '0.4rem', border: 'none' }} onClick={() => onEdit(exp)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444', border: 'none' }} onClick={() => onDelete(exp.ID)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const CategorySummaryList = ({ data }) => {
    return (
      <>
        {/* Desktop Table */}
        <div className="table-container mobile-hide">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Income</th>
                <th style={{ textAlign: 'right' }}>Expense</th>
                <th style={{ textAlign: 'right' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ textAlign: 'right', color: 'var(--income)' }}>{item.income > 0 ? formatCurrency(item.income) : '-'}</td>
                  <td style={{ textAlign: 'right', color: 'var(--expense)' }}>{item.expense > 0 ? formatCurrency(item.expense) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.income - item.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="transaction-cards summary-cards">
          {data.map((item, i) => (
            <div key={i} className="transaction-card summary-card">
              <div className="t-card-left">
                <span className="t-card-category">{item.name}</span>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                  {item.income > 0 && <span style={{ color: 'var(--income)' }}>In: {formatCurrency(item.income)}</span>}
                  {item.expense > 0 && <span style={{ color: 'var(--expense)' }}>Out: {formatCurrency(item.expense)}</span>}
                </div>
              </div>
              <div className="t-card-right">
                <span className="t-card-amount" style={{ color: (item.income - item.expense) >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {formatCurrency(item.income - item.expense)}
                </span>
                <span className="t-card-mode" style={{ fontSize: '0.6rem' }}>Net Balance</span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    const res = await call({}, 'deleteExpense', { ID: id });
    if (res) refreshData();
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ... previous logic remains ...

  return (
    <div className={`app-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Overlay for Mobile */}
      <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">XPENSE</div>
          <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={view === 'expenses' ? 'active' : ''}
            onClick={() => { setView('expenses'); setIsSidebarOpen(false); }}
          >
            <Receipt size={20} />
            <span>Expenses</span>
          </button>

          <div className="sidebar-footer">
            <button className={view === 'categories' ? 'settings-btn-alt active' : 'settings-btn-alt'} onClick={() => { setIsModalOpen('settings'); setIsSidebarOpen(false); }}>
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="main-header">
          <button className="hamburger" onClick={() => setIsSidebarOpen(true)}>
            <LayoutDashboard size={24} />
          </button>
          <div className="header-title">
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </div>
          <div className="header-actions">
            {view === 'dashboard' && (
              <select
                className="month-selector"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Time' : new Date(m + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            )}
            <button className="refresh-circle" onClick={refreshData} title="Refresh Data">
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </header>

        <div className="content-area">
          {view === 'dashboard' && (
            <main className="fade-in">
              <div className="stats-grid top-stats">
                <StatCard title="Total Balance" value={formatCurrency(stats.balance)} icon={<Wallet size={20} />} />
                <StatCard title="Total Income" value={formatCurrency(stats.income)} icon={<ArrowUpCircle size={20} />} variant="income" />
                <StatCard title="Total Expenses" value={formatCurrency(stats.expense)} icon={<ArrowDownCircle size={20} />} variant="expense" />
              </div>

              <div className="charts-grid" style={{ position: 'relative' }}>
                {loading && <div className="loading-overlay">Syncing...</div>}
                {MAIN_TYPES.map((type, i) => {
                  const chartData = filteredExpenses
                    .filter(e => (e.Type || '').trim().toLowerCase() === type.trim().toLowerCase())
                    .reduce((acc, e) => {
                      const label = e.Category || e.Description || 'Other';
                      const existing = acc.find(item => item.name === label);
                      if (existing) existing.value += Number(e.Amount || 0);
                      else acc.push({ name: label, value: Number(e.Amount || 0) });
                      return acc;
                    }, []);

                  return (
                    <DonutChart
                      key={i}
                      title={type}
                      data={chartData}
                    />
                  );
                })}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Category Summary</h2>
              <CategorySummaryList data={categorySummary} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Recent Activity</h2>
                <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setIsModalOpen('expense'); }}>
                  <Plus size={18} /> <span className="hide-mobile">Add Transaction</span><span className="show-mobile">Add</span>
                </button>
              </div>

              <TransactionList transactions={filteredExpenses.slice(0, 5)} />
            </main>
          )}

          {view === 'expenses' && (
            <section className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Transactions</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setIsModalOpen('expense'); }}>
                    <Plus size={18} /> Add
                  </button>
                </div>
              </div>

              <TransactionList
                transactions={expenses}
                onDelete={handleDelete}
                onEdit={(exp) => { setEditingExpense(exp); setIsModalOpen('expense'); }}
                showActions={true}
              />
            </section>
          )}

          {view === 'categories' && (
            <section className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Manage Categories</h1>
                <button className="btn btn-primary" onClick={() => setIsModalOpen('category')}>
                  <Plus size={18} /> Add Category
                </button>
              </div>
              <div className="stats-grid">
                {MAIN_TYPES.map(type => (
                  <CategoryCard
                    key={type}
                    title={type}
                    items={categories[type] || []}
                    type={type}
                    onRemove={(cat) => handleRemoveCategory(type, cat)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Modals */}
      {isModalOpen === 'expense' && (
        <ExpenseModal
          onClose={() => setIsModalOpen(null)}
          onSubmit={async (data) => {
            const action = editingExpense ? 'updateExpense' : 'addExpense';
            const res = await call({}, action, data);
            if (res) { setIsModalOpen(null); refreshData(); }
          }}
          categories={categories}
          initialData={editingExpense}
        />
      )}

      {isModalOpen === 'category' && (
        <CategoryModal
          onClose={() => setIsModalOpen(null)}
          onSubmit={async (data) => {
            const res = await call({}, 'addCategory', data);
            if (res) { setIsModalOpen(null); refreshData(); }
          }}
        />
      )}

      {isModalOpen === 'settings' && (
        <SettingsModal
          onClose={() => setIsModalOpen(null)}
          onManageCategories={() => { setView('categories'); setIsModalOpen(null); }}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, variant }) => (
  <div className="card">
    <div className="card-title">{icon} {title}</div>
    <div className={`card-value ${variant || ''}`}>{value}</div>
  </div>
);

const DonutChart = ({ title, data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card chart-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{title}</h3>
        <span style={{ fontWeight: 700, color: title === 'Income' ? 'var(--income)' : 'var(--text-main)' }}>
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total)}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

const CategoryCard = ({ title, items, onRemove }) => (
  <div className="card">
    <div className="card-title">{title} Categories</div>
    <div style={{ marginTop: '1rem' }}>
      {(items || []).map(cat => (
        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)' }}>
          <span>{cat}</span>
          <button onClick={() => onRemove(cat)} style={{ background: 'none', border: 'none', color: '#ff1744', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// Modals Components (simplified for brevity)
const ExpenseModal = ({ onClose, onSubmit, categories, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    Date: new Date().toISOString().split('T')[0],
    Type: '',
    Category: '',
    Amount: '',
    PaymentMode: 'Cash',
    Description: ''
  });

  const categoriesToRender = useMemo(() => {
    const fetched = categories[formData.Type] || [];
    if (formData.Type === 'Transfer' && fetched.length === 0) {
      return ['Cash to Bank', 'Bank to Cash', 'Bank to Bank'];
    }
    return fetched;
  }, [formData.Type, categories]);

  useEffect(() => {
    // When Type changes, we reset Category to empty so user can select
    setFormData(prev => ({ ...prev, Category: '' }));
  }, [formData.Type]);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{initialData ? 'Edit' : 'Add'} Transaction</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={formData.Date} onChange={e => setFormData({ ...formData, Date: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Main Type</label>
              <select value={formData.Type} onChange={e => setFormData({ ...formData, Type: e.target.value })} required>
                <option value="">Select Type</option>
                {MAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Sub Category</label>
              <select value={formData.Category} onChange={e => setFormData({ ...formData, Category: e.target.value })} required>
                <option value="">Select Category</option>
                {categoriesToRender.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="General">General</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount</label>
              <input type="number" value={formData.Amount} onChange={e => setFormData({ ...formData, Amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Mode</label>
              <select value={formData.PaymentMode} onChange={e => setFormData({ ...formData, PaymentMode: e.target.value })} required>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={formData.Description} onChange={e => setFormData({ ...formData, Description: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save</button>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CategoryModal = ({ onClose, onSubmit }) => {
  const [data, setData] = useState({ Type: 'Living Expenses', Category: '' });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Add Category</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }}>
          <div className="form-group">
            <label>Main Type</label>
            <select value={data.Type} onChange={e => setData({ ...data, Type: e.target.value })}>
              {MAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Category Name</label>
            <input type="text" value={data.Category} onChange={e => setData({ ...data, Category: e.target.value })} required placeholder="e.g. Rent, Grocery" />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Add</button>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SettingsModal = ({ onClose, onManageCategories }) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button className="mobile-close" onClick={onClose} style={{ display: 'block' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={onManageCategories}>
            <Settings size={18} /> Manage Categories
          </button>

          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
            Database connected via .env
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
