'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { getCategories, saveCategory, deleteCategory } from '@/app/actions';

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#a855f7',
];

const PRESET_ICONS = ['🧑‍💼', '🧠', '💪', '🏠', '🎨', '📚', '🎯', '🚀', '💡', '🎵', '🌱', '💰'];

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCat, setEditCat]         = useState(null);
  const [catForm, setCatForm]         = useState({ name: '', color: '#7c5af0', icon: '🎯' });

  async function loadData() {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch(e) {
      // ignore or handle auth error
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openNewCat() {
    setEditCat(null);
    setCatForm({ name: '', color: PRESET_COLORS[0], icon: PRESET_ICONS[0] });
    setShowCatForm(true);
  }

  function openEditCat(cat) {
    setEditCat(cat);
    setCatForm({ name: cat.name, color: cat.color, icon: cat.icon });
    setShowCatForm(true);
  }

  async function handleSaveCat() {
    if (!catForm.name.trim()) return;
    await saveCategory({ ...catForm, id: editCat?.id });
    await loadData();
    setShowCatForm(false);
  }

  async function handleDeleteCat(id) {
    if (!confirm('Delete this category? Sessions logged under it will still be preserved.')) return;
    await deleteCategory(id);
    await loadData();
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏷️ Categories</h1>
          <p className="page-subtitle">Manage life areas to group your focus sessions.</p>
        </div>
        <button id="new-category-btn" className="btn btn-primary" onClick={openNewCat}>
          + New Category
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {categories.length === 0 ? (
          <div className="card empty-state" style={{ minHeight: 300 }}>
            <div className="empty-state-icon">🏷️</div>
            <h3>No categories yet</h3>
            <p>Create a category to organize your focus blocks.</p>
            <button id="create-first-cat-btn" className="btn btn-primary mt-4" onClick={openNewCat}>
              Create your first category
            </button>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} id={`cat-row-${cat.id}`}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem',
                borderLeft: `4px solid ${cat.color}`,
              }}>
              {/* Color dot */}
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: `${cat.color}25`,
                border: `1px solid ${cat.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.375rem', flexShrink: 0,
              }}>
                {cat.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cat.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color }} />
                  <span className="text-xs text-muted mono">{cat.color}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  id={`edit-cat-${cat.id}`}
                  className="btn btn-secondary btn-sm"
                  onClick={() => openEditCat(cat)}
                >
                  ✎ Edit
                </button>
                <button
                  id={`delete-cat-${cat.id}`}
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteCat(cat.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category form modal */}
      {showCatForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editCat ? 'Edit Category' : 'New Category'}</h3>
              <button id="close-cat-modal" className="btn btn-ghost btn-icon" onClick={() => setShowCatForm(false)}>✕</button>
            </div>

            <div className="form-group">
              <label htmlFor="cat-name">Name *</label>
              <input
                id="cat-name"
                type="text"
                className="input"
                placeholder="e.g. Deep Work, Personal Growth…"
                value={catForm.name}
                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                maxLength={40}
              />
            </div>

            {/* Icon picker */}
            <div className="form-group">
              <label>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {PRESET_ICONS.map(icon => (
                  <button
                    key={icon}
                    id={`icon-pick-${icon}`}
                    className={`btn btn-sm ${catForm.icon === icon ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '1.25rem', padding: '0.375rem 0.5rem' }}
                    onClick={() => setCatForm(f => ({ ...f, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="form-group">
              <label>Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    id={`color-pick-${color}`}
                    title={color}
                    onClick={() => setCatForm(f => ({ ...f, color }))}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: color, border: 'none', cursor: 'pointer',
                      outline: catForm.color === color ? `3px solid white` : 'none',
                      outlineOffset: 2,
                      transition: 'transform 0.15s',
                      transform: catForm.color === color ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              {/* Preview */}
              <div className="flex items-center gap-2">
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: `${catForm.color}25`, border: `1px solid ${catForm.color}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.125rem',
                }}>
                  {catForm.icon}
                </div>
                <span style={{ fontWeight: 600, color: catForm.color }}>{catForm.name || 'Preview'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button id="cancel-cat-btn" className="btn btn-secondary flex-1" onClick={() => setShowCatForm(false)}>Cancel</button>
              <button
                id="save-cat-btn"
                className="btn btn-primary flex-1"
                onClick={handleSaveCat}
                disabled={!catForm.name.trim()}
              >
                {editCat ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
