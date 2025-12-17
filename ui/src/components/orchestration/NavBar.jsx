import React from 'react';

export default function NavBar({
    gitStatus,
    config,
    projects,
    targetProject,
    setTargetProject,
    showProjectControls,
    setShowProjectControls,
    switching,
    switchProject,
    setShowCreateProject
}) {
    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e0e0e0',
            marginBottom: '40px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            borderRadius: '8px'
        }}>
            {/* Left: Branding & Git Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2em', color: '#333' }}>NLP Lab</h2>

                {/* Git Status Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    background: gitStatus.is_clean ? '#e6f4ea' : '#fff8e1',
                    color: gitStatus.is_clean ? '#137333' : '#b06000',
                    border: `1px solid ${gitStatus.is_clean ? '#ceead6' : '#ffe082'}`
                }}>
                    {gitStatus.is_clean ? (
                        <>
                            <span>✓ Clean</span>
                            <span style={{ opacity: 0.7, fontWeight: 'normal' }}>({gitStatus.current_commit?.hash?.substring(0, 7)})</span>
                        </>
                    ) : (
                        <details style={{ position: 'relative', cursor: 'pointer' }}>
                            <summary style={{ listStyle: 'none' }}>
                                ⚠️ Dirty ({gitStatus.uncommitted_files.length}) ▾
                            </summary>
                            <div style={{
                                position: 'absolute',
                                top: '120%',
                                left: 0,
                                background: 'white',
                                border: '1px solid #ccc',
                                padding: '10px',
                                borderRadius: '4px',
                                width: '300px',
                                zIndex: 100,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                <strong style={{ display: 'block', marginBottom: '5px', color: '#333' }}>Uncommitted Changes:</strong>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: '#555' }}>
                                    {gitStatus.uncommitted_files.map((f, i) => (
                                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span>{f}</span>
                                            <a
                                                href={`${config.ide_scheme || 'vscode'}://file${config.project_root}/${f}`}
                                                title={`Open in ${config.ide_scheme || 'Editor'}`}
                                                style={{ textDecoration: 'none', cursor: 'pointer' }}
                                            >
                                                📝
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </details>
                    )}
                </div>

                {gitStatus.is_detached && (
                    <span style={{
                        fontSize: '0.8em',
                        background: '#e8f0fe',
                        color: '#1967d2',
                        padding: '4px 8px',
                        borderRadius: '4px'
                    }}>
                        ℹ️ Detached Head
                    </span>
                )}
            </div>

            {/* Right: Project Context */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.75em', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Project</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#1a1a1a' }}>{projects.current_project}</span>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowProjectControls(!showProjectControls)}
                        style={{
                            background: showProjectControls ? '#f1f3f4' : 'transparent',
                            border: '1px solid #dadce0',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2em',
                            transition: 'all 0.2s'
                        }}
                    >
                        ⚙️
                    </button>

                    {/* Dropdown Menu */}
                    {showProjectControls && (
                        <div style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            width: '300px',
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '15px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 1000
                        }}>
                            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Switch Project</h4>
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                                <select
                                    value={targetProject}
                                    onChange={(e) => setTargetProject(e.target.value)}
                                    disabled={switching}
                                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                                >
                                    {projects.projects.map(p => (
                                        <option key={p.name} value={p.name}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={switchProject}
                                    disabled={switching || targetProject === projects.current_project}
                                    style={{
                                        background: '#1a73e8',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0 12px',
                                        cursor: 'pointer',
                                        opacity: (switching || targetProject === projects.current_project) ? 0.5 : 1
                                    }}
                                >
                                    Switch
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid #eee', margin: '10px 0' }}></div>

                            <button
                                onClick={() => setShowCreateProject(true)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'transparent',
                                    border: '1px dashed #ccc',
                                    borderRadius: '4px',
                                    color: '#666',
                                    cursor: 'pointer'
                                }}
                            >
                                + Create New Project
                            </button>

                            {switching && <p style={{ color: '#b06000', fontSize: '0.85em', marginTop: '10px', textAlign: 'center' }}>⏳ Switching...</p>}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
