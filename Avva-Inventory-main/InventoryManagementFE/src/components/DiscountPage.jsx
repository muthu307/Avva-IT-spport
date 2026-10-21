import React, { useState, useRef, useEffect } from "react";
import api from '../utils/api';
import { 
  Percent, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Calculator, 
  HelpCircle,
  Tag,
  AlertTriangle
} from "lucide-react";

const fmt = (n) => {
  if (n === null || n === undefined) return "∞";
  return "₹" + Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const DiscountPage = () => {
  const [ranges, setRanges] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [calcAmt, setCalcAmt] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanges();
  }, []);

  const loadRanges = async () => {
    try {
      setLoading(true);
      const response = await api.get('/discounts');
      setRanges(response.data);
    } catch (error) {
      console.error('Error loading ranges:', error);
      notify("Failed to load discount ranges", "error");
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const findRange = (amount) => {
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0) return null;
    return ranges.find((r) => {
      if (r.isInfinite) {
        return a >= r.min;
      }
      return a >= r.min && a <= r.max;
    }) || null;
  };

  const matched = findRange(calcAmt);
  const calcAmtN = parseFloat(calcAmt) || 0;
  const discPct = matched ? matched.discount : 0;
  const discAmt = (calcAmtN * discPct) / 100;
  const finalAmt = calcAmtN - discAmt;

  const startEdit = (row) => {
    setEditId(row.id);
    setEditVals({
      min: row.min,
      max: row.max === null ? "" : row.max,
      discount: row.discount,
      isInfinite: row.isInfinite,
    });
  };

  const validateRanges = (newRange, isInfinite) => {
    const sortedRanges = [...ranges].sort((a, b) => a.min - b.min);
    
    for (let i = 0; i < sortedRanges.length; i++) {
      const current = sortedRanges[i];
      if (current.id === newRange.id) continue;
      
      if (isInfinite) {
        if (newRange.min <= current.max && current.max !== null) {
          return false;
        }
        if (current.isInfinite) {
          return false;
        }
      } else if (current.isInfinite) {
        if (newRange.max >= current.min) {
          return false;
        }
      } else {
        if (!(newRange.max < current.min || newRange.min > current.max)) {
          return false;
        }
      }
    }
    return true;
  };

  const saveEdit = async (id) => {
    const mn = parseFloat(editVals.min);
    let mx = editVals.max === "" || editVals.max === undefined ? null : parseFloat(editVals.max);
    const d = parseFloat(editVals.discount);
    const isInfinite = mx === null;

    if (isNaN(mn) || mn < 0) {
      notify("Enter a valid min amount.", "error");
      return;
    }

    if (!isInfinite && (isNaN(mx) || mx <= mn)) {
      notify("Max must be greater than min.", "error");
      return;
    }

    if (isNaN(d) || d < 0 || d > 100) {
      notify("Discount must be 0–100.", "error");
      return;
    }

    if (isInfinite && ranges.some(r => r.id !== id && r.isInfinite)) {
      notify("Only one infinite range is allowed.", "error");
      return;
    }

    const newRange = { id, min: mn, max: mx, discount: d, isInfinite };
    
    if (!validateRanges(newRange, isInfinite)) {
      notify("Ranges cannot overlap!", "error");
      return;
    }

    try {
      const result = await api.put(`/discounts/${id}`, { min: mn, max: mx, discount: d, isInfinite });
      
      setRanges((p) =>
        p.map((r) =>
          r.id === id ? result.data.range : r
        )
      );
      
      setRanges((p) => [...p].sort((a, b) => a.min - b.min));
      setEditId(null);
      notify("Range saved successfully!");
    } catch (error) {
      notify(error.response?.data?.error || error.message, "error");
    }
  };

  const deleteRow = async (id) => {
    const rowToDelete = ranges.find(r => r.id === id);
    if (rowToDelete?.isInfinite) {
      notify("Cannot delete the infinity range. Edit it instead.", "error");
      return;
    }
    
    try {
      await api.delete(`/discounts/${id}`);
      setRanges((p) => p.filter((r) => r.id !== id));
      notify("Range deleted.", "warn");
    } catch (error) {
      notify(error.response?.data?.error || error.message, "error");
    }
  };

  const addRow = async () => {
    const nonInfiniteRanges = ranges.filter(r => !r.isInfinite);
    const lastNonInfinite = nonInfiniteRanges[nonInfiniteRanges.length - 1];
    const newMin = lastNonInfinite ? lastNonInfinite.max + 1 : 0;
    
    const newRow = {
      min: newMin,
      max: newMin + 4999,
      discount: 0,
      isInfinite: false,
    };
    
    try {
      const result = await api.post('/discounts', newRow);
      const savedRow = result.data.range;
      
      const infinityIndex = ranges.findIndex(r => r.isInfinite);
      if (infinityIndex !== -1) {
        const newRanges = [...ranges];
        newRanges.splice(infinityIndex, 0, savedRow);
        setRanges(newRanges);
      } else {
        setRanges((p) => [...p, savedRow]);
      }
      
      setTimeout(() => startEdit(savedRow), 0);
      notify("New range added!");
    } catch (error) {
      notify(error.response?.data?.error || error.message, "error");
    }
  };

  const handleEditChange = (fieldKey, value) => {
    setEditVals((v) => ({ ...v, [fieldKey]: value }));
  };

  const EditField = ({ fieldKey, placeholder, width = 100, rowId }) => {
    const inputRef = useRef(null);
    
    useEffect(() => {
      if (inputRef.current && fieldKey === "min") {
        inputRef.current.focus();
      }
    }, [fieldKey]);

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#0f172a',
        border: '1px solid #6366f1',
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        {(fieldKey === "min" || fieldKey === "max") && (
          <span style={{
            padding: '0 8px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            borderRight: '1px solid #334155'
          }}>₹</span>
        )}
        <input
          ref={inputRef}
          style={{
            width,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: '600',
            height: '32px',
            padding: '0 8px',
            boxSizing: 'border-box'
          }}
          type="number"
          min="0"
          max={fieldKey === "discount" ? 100 : undefined}
          step={fieldKey === "discount" ? "1" : "0.01"}
          placeholder={placeholder}
          value={editVals[fieldKey] === null ? "" : editVals[fieldKey]}
          onChange={(e) => handleEditChange(fieldKey, e.target.value)}
          disabled={fieldKey === "max" && editVals.isInfinite}
        />
        {fieldKey === "discount" && (
          <span style={{
            padding: '0 8px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            borderLeft: '1px solid #334155'
          }}>%</span>
        )}
        {fieldKey === "max" && (
          <button
            type="button"
            style={{
              background: editVals.isInfinite ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)',
              border: 'none',
              color: '#38bdf8',
              width: '30px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '700',
            }}
            onClick={(e) => {
              e.preventDefault();
              setEditVals((v) => ({
                ...v,
                max: v.isInfinite ? (v.max || "") : null,
                isInfinite: !v.isInfinite,
              }));
            }}
            title={editVals.isInfinite ? "Set finite max" : "Set infinite max"}
          >
            {editVals.isInfinite ? "∞" : "↗"}
          </button>
        )}
      </div>
    );
  };

  const styles = {
    container: {
      padding: '24px',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      maxWidth: '1400px',
      margin: '0 auto',
      minHeight: '100vh',
      boxSizing: 'border-box',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: 0,
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '14px',
      marginTop: '4px',
    },
    btnAdd: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      padding: '10px 18px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      transition: 'all 0.2s ease',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 340px',
      gap: '24px',
      alignItems: 'start',
    },
    card: {
      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
      borderRadius: '16px',
      border: '1px solid #334155',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
    },
    th: {
      padding: '14px 18px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '700',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: '#0f172a',
      borderBottom: '1px solid #334155',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '14px 18px',
      borderBottom: '1px solid #1e293b',
      color: '#f8fafc',
      verticalAlign: 'middle',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
      background: 'rgba(56, 189, 248, 0.15)',
      color: '#38bdf8',
      border: '1px solid rgba(56, 189, 248, 0.3)',
    },
    progressBarTrack: {
      width: '80px',
      height: '5px',
      background: '#0f172a',
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '4px',
      border: '1px solid #334155',
    },
    progressBarFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #38bdf8, #3b82f6)',
      borderRadius: '3px',
    },
    actionBtn: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s ease',
    },
    calcCard: {
      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
      borderRadius: '16px',
      border: '1px solid #334155',
      padding: '24px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      position: 'sticky',
      top: '85px',
    },
    calcInputWrap: {
      display: 'flex',
      alignItems: 'center',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      overflow: 'hidden',
      marginTop: '8px',
    },
    calcSym: {
      padding: '0 12px',
      fontSize: '15px',
      fontWeight: '700',
      color: '#38bdf8',
      background: 'rgba(56, 189, 248, 0.1)',
      height: '42px',
      display: 'flex',
      alignItems: 'center',
      borderRight: '1px solid #334155',
    },
    calcInput: {
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: '#f8fafc',
      fontSize: '16px',
      fontWeight: '700',
      height: '42px',
      padding: '0 12px',
      width: '100%',
      boxSizing: 'border-box',
    },
    toastContainer: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", padding: "100px", color: "#94a3b8" }}>
          Loading discount rules...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Toast Alert Popup */}
      {toast && (
        <div style={styles.toastContainer}>
          <div style={{
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            background: toast.type === "success" ? "linear-gradient(135deg, #10b981, #059669)" : toast.type === "error" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #f59e0b, #d97706)",
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {toast.type === "success" && <Check size={16} />}
            {toast.type === "error" && <X size={16} />}
            {toast.type === "warn" && <AlertTriangle size={16} />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Percent size={30} color="#6366f1" />
            Discount Ranges
          </h1>
          <p style={styles.subtitle}>
            Configure order amount thresholds and discount percentages
          </p>
        </div>
        <button style={styles.btnAdd} onClick={addRow}>
          <Plus size={16} /> Add Range
        </button>
      </div>

      <div style={styles.grid}>
        {/* Left Column: Discount Table */}
        <div>
          <div style={styles.card}>
            {ranges.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <Tag size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>No discount ranges defined. Click <strong>+ Add Range</strong> to start.</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Min Amount</th>
                    <th style={styles.th}>Max Amount</th>
                    <th style={styles.th}>Discount %</th>
                    <th style={{...styles.th, textAlign: 'center'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ranges.map((row) => {
                    const ed = editId === row.id;
                    const isActive = matched && matched.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: isActive ? 'rgba(56, 189, 248, 0.08)' : ed ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          transition: 'background 0.2s',
                          borderLeft: isActive ? '3px solid #38bdf8' : 'none',
                        }}
                      >
                        <td style={styles.td}>
                          {ed ? (
                            <EditField fieldKey="min" placeholder="0" width={110} rowId={row.id} />
                          ) : (
                            <span style={{ fontWeight: '600', color: '#f8fafc' }}>{fmt(row.min)}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {ed ? (
                            <EditField fieldKey="max" placeholder={row.isInfinite ? "∞" : "1000"} width={110} rowId={row.id} />
                          ) : (
                            <span style={{ fontWeight: '600', color: '#f8fafc' }}>
                              {row.isInfinite ? "∞" : fmt(row.max)}
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {ed ? (
                            <EditField fieldKey="discount" placeholder="0" width={72} rowId={row.id} />
                          ) : (
                            <div>
                              <span style={styles.badge}>
                                {row.discount}% OFF
                              </span>
                              <div style={styles.progressBarTrack}>
                                <div style={{...styles.progressBarFill, width: `${Math.min(row.discount, 100)}%`}} />
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{...styles.td, textAlign: 'center'}}>
                          {ed ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                style={{...styles.actionBtn, background: '#10b981', color: 'white'}}
                                onClick={() => saveEdit(row.id)}
                              >
                                <Check size={12} /> Save
                              </button>
                              <button
                                style={{...styles.actionBtn, background: '#334155', color: '#cbd5e1'}}
                                onClick={() => setEditId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                style={{...styles.actionBtn, background: '#334155', color: '#38bdf8'}}
                                onClick={() => startEdit(row)}
                                title="Edit Range"
                              >
                                <Edit size={13} /> Edit
                              </button>
                              <button
                                style={{...styles.actionBtn, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171'}}
                                onClick={() => deleteRow(row.id)}
                                title="Delete Range"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <div style={{ marginTop: '14px', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} color="#6366f1" />
            <span>Enter order amount into the live calculator to verify discount matching. Infinity (∞) handles open-ended tiers.</span>
          </div>
        </div>

        {/* Right Column: Live Calculator */}
        <div>
          <div style={styles.calcCard}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} color="#38bdf8" />
              Live Calculator
            </h2>

            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
              Enter Order Amount
            </label>
            <div style={styles.calcInputWrap}>
              <span style={styles.calcSym}>₹</span>
              <input
                style={styles.calcInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2500"
                value={calcAmt}
                onChange={(e) => setCalcAmt(e.target.value)}
              />
            </div>

            {calcAmtN > 0 ? (
              <div style={{ marginTop: '20px' }}>
                {matched ? (
                  <>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      Matched Tier: {fmt(matched.min)} – {matched.isInfinite ? "∞" : fmt(matched.max)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Original Total:</span>
                      <span style={{ fontWeight: '600', color: '#f8fafc' }}>{fmt(calcAmtN)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Discount ({discPct}%):</span>
                      <span style={{ fontWeight: '600', color: '#f87171' }}>− {fmt(discAmt)}</span>
                    </div>

                    <div style={{ height: '1px', background: '#334155', margin: '12px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '14px' }}>Final Amount:</span>
                      <span style={{ fontWeight: '800', color: '#34d399', fontSize: '20px' }}>{fmt(finalAmt)}</span>
                    </div>

                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(52, 211, 153, 0.1)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      color: '#34d399',
                      fontSize: '12px',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      🎉 You save {fmt(discAmt)} ({discPct}% off)
                    </div>
                  </>
                ) : (
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertTriangle size={16} />
                    <span>No defined range matches ₹{calcAmtN.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                marginTop: '20px',
                padding: '20px 14px',
                border: '1px dashed #334155',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '12px',
              }}>
                Type an order amount above to preview discount calculation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountPage;