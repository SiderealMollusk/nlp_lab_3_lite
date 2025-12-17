import React, { useState } from 'react';

export default function PlanningCard({
    status,
    plans,
    selectedPlan,
    setSelectedPlan,
    files, // Currently unused in rendering but logic implies usage later
    handleMakePlan,
    canMakePlan,
    canDispatch,
    onDispatch,
    onClear,
    flashPlan,
    setPlans,
    config,
    setMessage
}) {
    const [showNewPlanInput, setShowNewPlanInput] = useState(false);
    const [newPlanNameVal, setNewPlanNameVal] = useState('');
    const [lastCreatedPlan, setLastCreatedPlan] = useState(null);

    const openPlanFile = (path) => {
        const link = `${config.ide_scheme || 'vscode'}://file${path.replace('/app', config.project_root)}`;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = link;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 2000);
    };

    const createPlanStub = async () => {
        if (!newPlanNameVal) return;

        try {
            const response = await fetch(`http://localhost:8000/plans/create?name=${encodeURIComponent(newPlanNameVal)}`, { method: 'POST' });
            const data = await response.json();

            if (data.status === 'success') {
                // Set backup link state
                setLastCreatedPlan({ name: data.name, path: data.path });

                // Auto-open with delay
                setTimeout(() => openPlanFile(data.path), 1000);

                setMessage(`Created plan: ${data.name}`);
                // Refresh plans
                const plansRes = await fetch('http://localhost:8000/plans');
                const plansData = await plansRes.json();
                setPlans(plansData.plans);
                setSelectedPlan(data.name);
                setShowNewPlanInput(false);
                setNewPlanNameVal('');
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: flashPlan ? '0 0 0 4px rgba(26,115,232,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'box-shadow 0.3s'
        }}>
            <h2 style={{
                margin: 0,
                padding: '15px 25px',
                background: '#1967d2',
                color: 'white',
                fontSize: '1.1em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>1. Planning</span>
                <span style={{ fontSize: '0.7em', color: '#1967d2', background: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {status.planned_jobs} Jobs
                </span>
            </h2>

            <div style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Inputs */}
                <div>
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="plan-select" style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9em' }}>Select Plan Strategy</label>
                        <select
                            id="plan-select"
                            name="plan-select"
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Choose Plan --</option>
                            {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        {!showNewPlanInput ? (
                            <button
                                onClick={() => setShowNewPlanInput(true)}
                                style={{
                                    marginTop: '8px',
                                    background: 'none',
                                    border: '1px dashed #1967d2',
                                    color: '#1967d2',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '0.8em',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                + Code New Plan
                            </button>
                        ) : (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <input
                                    id="new-plan-name"
                                    name="new_plan_name"
                                    value={newPlanNameVal}
                                    onChange={(e) => setNewPlanNameVal(e.target.value)}
                                    placeholder="my_plan_name"
                                    onKeyDown={(e) => e.key === 'Enter' && createPlanStub()}
                                    autoFocus
                                    style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #1967d2', fontSize: '0.9em' }}
                                />
                                <button onClick={createPlanStub} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>✅</button>
                                <button onClick={() => setShowNewPlanInput(false)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>❌</button>
                            </div>
                        )}

                        {lastCreatedPlan && (
                            <div style={{ marginTop: '5px', fontSize: '0.85em', textAlign: 'right' }}>
                                <span style={{ color: '#666', marginRight: '5px' }}>File created?</span>
                                <button
                                    onClick={() => openPlanFile(lastCreatedPlan.path)}
                                    style={{ background: 'none', border: 'none', color: '#188038', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                >
                                    Open {lastCreatedPlan.name}.py
                                </button>
                            </div>
                        )}
                    </div>
                    {/* File Inputs logic implies we assume 'corpus' for now based on legacy code, 
                    but truly dynamic inputs would map `files` here. Keeping it simpl-ish for current state */}
                    <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="corpus-select" style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9em' }}>Corpus</label>
                        <select
                            id="corpus-select"
                            name="corpus-select"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                        >
                            <option>corpus.jsonl</option>
                            {/* Placeholder as per previous UI logic */}
                        </select>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                    <button
                        onClick={handleMakePlan}
                        disabled={!canMakePlan}
                        style={{
                            padding: '12px',
                            background: canMakePlan ? '#1a73e8' : '#e0e0e0',
                            color: canMakePlan ? 'white' : '#888',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: canMakePlan ? 'pointer' : 'not-allowed',
                            fontWeight: '600'
                        }}
                    >
                        Make Plan
                    </button>

                    <button
                        onClick={onDispatch}
                        disabled={!canDispatch}
                        style={{
                            padding: '12px',
                            background: 'transparent',
                            border: `2px solid ${canDispatch ? '#137333' : '#e0e0e0'}`,
                            color: canDispatch ? '#137333' : '#aaa',
                            borderRadius: '6px',
                            cursor: canDispatch ? 'pointer' : 'not-allowed',
                            fontWeight: '600',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        🚀 Dispatch Plan
                    </button>

                    <button
                        onClick={onClear}
                        style={{
                            padding: '8px',
                            background: 'transparent',
                            color: '#d93025',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                        }}
                    >
                        Clear Plan
                    </button>
                </div>
            </div>
        </div>
    );
}
