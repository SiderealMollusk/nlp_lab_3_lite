import React from 'react';

export default function CompletionCard({
    flashComplete,
    hasResultsInMemory,
    status,
    lastResult,
    config,
    collectLabel,
    setCollectLabel,
    collectResults,
    forceCollect,
    readyToCollect,
    message,
    onReset
}) {
    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: flashComplete ? '0 0 0 4px rgba(24,128,56,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'box-shadow 0.3s'
        }}>
            <h2 style={{
                margin: 0,
                padding: '15px 25px',
                background: '#188038',
                color: 'white',
                fontSize: '1.1em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>3. Completion</span>
                {hasResultsInMemory && (
                    <span style={{ fontSize: '0.7em', color: '#d93025', background: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        ⚠️ Unsaved Results
                    </span>
                )}
            </h2>

            <div style={{ padding: '25px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#137333', marginBottom: '10px' }}>
                    {status.completed_jobs}
                </div>
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '20px' }}>Completed Jobs</div>

                {/* LAST RESULT - PROMINENT LINK */}
                {lastResult && (
                    <div style={{
                        marginBottom: '25px',
                        padding: '15px',
                        background: '#e6f4ea',
                        border: '1px solid #1e8e3e',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'fadeIn 0.5s ease-in-out'
                    }}>
                        <span style={{ fontSize: '0.9em', color: '#137333', fontWeight: 'bold' }}>🎉 Collection Complete!</span>
                        <a
                            href={`${config.ide_scheme || 'vscode'}://file${lastResult.path.replace('/app', config.project_root)}`}
                            title="Open Result File in Editor"
                            style={{
                                textDecoration: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2em',
                                fontWeight: 'bold',
                                color: '#1e8e3e',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px',
                                background: 'white',
                                borderRadius: '20px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            <span>📄 Open {lastResult.filename}</span>
                            <span style={{ fontSize: '1.4em' }}>📝</span>
                        </a>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', maxWidth: '500px', margin: '0 auto', alignItems: 'stretch' }}>
                    <input
                        type="text"
                        value={collectLabel}
                        onChange={(e) => setCollectLabel(e.target.value)}
                        placeholder="e.g. test_run_v1 (optional)"
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                    <button
                        onClick={collectResults}
                        disabled={!hasResultsInMemory}
                        style={{
                            padding: '0 20px',
                            background: readyToCollect ? '#1e8e3e' : '#e0e0e0',
                            color: readyToCollect ? 'white' : '#888',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: hasResultsInMemory ? 'pointer' : 'not-allowed',
                            boxShadow: readyToCollect ? '0 2px 6px rgba(30,142,62,0.3)' : 'none'
                        }}
                    >
                        {readyToCollect ? '✓ Collect to Disk' : 'Collect Results'}
                    </button>
                </div>

                {message && (
                    <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.9em', color: '#333' }}>
                        {message}
                    </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button onClick={forceCollect} style={{ color: '#f9ab00', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85em' }}>
                        ⚠️ Force Collect
                    </button>
                    <button onClick={onReset} style={{ color: '#d93025', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85em' }}>
                        Reset / Flush
                    </button>
                </div>
            </div>
        </div>
    );
}
