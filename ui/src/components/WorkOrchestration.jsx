import { useState, useEffect } from 'react';

export default function WorkOrchestration() {
    const [status, setStatus] = useState({
        work_state: 'paused',
        planned_jobs: 0,
        queued_jobs: 0,
        completed_jobs: 0
    });
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [files, setFiles] = useState({ corpus: [], analysis_dirs: [] });
    const [fileInputs, setFileInputs] = useState({});
    const [collectLabel, setCollectLabel] = useState('');
    const [gitStatus, setGitStatus] = useState({ is_clean: true, uncommitted_files: [] });
    const [projects, setProjects] = useState({ current_project: 'default', projects: [] });
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [switching, setSwitching] = useState(false);
    const [message, setMessage] = useState('');
    const [flashPlan, setFlashPlan] = useState(false);
    const [flashQueue, setFlashQueue] = useState(false);
    const [flashComplete, setFlashComplete] = useState(false);
    const [targetProject, setTargetProject] = useState(projects.current_project);
    const [showProjectControls, setShowProjectControls] = useState(false);

    // Fetch available plans
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch('http://localhost:8000/plans');
                const data = await response.json();
                setPlans(data.plans);
                if (data.plans.length > 0) {
                    setSelectedPlan(data.plans[0].id);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            }
        };
        fetchPlans();
    }, []);

    // Fetch available files
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await fetch('http://localhost:8000/files');
                const data = await response.json();
                setFiles(data);
            } catch (error) {
                console.error('Error fetching files:', error);
            }
        };
        fetchFiles();
    }, []);

    // Fetch projects
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('http://localhost:8001/projects');
                const data = await response.json();
                setProjects(data);
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:8000/status');
                const data = await response.json();

                // Check for completion flash
                if (data.completed_jobs > 0 &&
                    data.queued_jobs === 0 &&
                    data.completed_jobs === status.completed_jobs + 1) {
                    setFlashComplete(true);
                    setTimeout(() => setFlashComplete(false), 1000);
                }

                setStatus(data);

                // Also fetch git status
                try {
                    const gitResponse = await fetch('http://localhost:8001/git/status');
                    const gitData = await gitResponse.json();
                    setGitStatus(gitData);
                } catch (err) {
                    console.error('Error fetching git status:', err);
                }
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 500);
        return () => clearInterval(interval);
    }, [status.completed_jobs]);

    const makePlan = async () => {
        try {
            const response = await fetch('http://localhost:8000/make-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: selectedPlan,
                    inputs: fileInputs
                })
            });
            const data = await response.json();
            setMessage(data.message);

            if (data.status === 'success') {
                setFlashPlan(true);
                setTimeout(() => setFlashPlan(false), 1000);
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const collectResults = async () => {
        try {
            const response = await fetch(`http://localhost:8000/collect?label=${encodeURIComponent(collectLabel)}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message + (data.filename ? ` → ${data.filename}` : ''));

            if (data.status === 'success') {
                setCollectLabel(''); // Clear label after successful collect
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const collectWithStash = async () => {
        try {
            const response = await fetch(`http://localhost:8000/collect-with-stash?label=${encodeURIComponent(collectLabel)}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message + (data.filename ? ` → ${data.filename}` : ''));

            if (data.status === 'success') {
                setCollectLabel('');
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    // Poll projects state (to catch the '--' state during switching)
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('http://localhost:8001/projects');
                const data = await response.json();
                setProjects(data);

                // Keep target project synced with current unless user changed it or we are switching
                if (data.current_project !== '--' && !showProjectControls) {
                    setTargetProject(data.current_project);
                }
            } catch (error) {
                console.error('Error polling projects:', error);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [showProjectControls]);


    const forceCollect = async () => {
        if (!window.confirm('Force collect will mark results as DIRTY. Continue?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/collect-force?label=${encodeURIComponent(collectLabel)}`, {
                method: 'POST',
            });
            const data = await response.json();
            setMessage(data.message + (data.filename ? ` → ${data.filename}` : ''));

            if (data.status === 'success') {
                setCollectLabel('');
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const createProject = async () => {
        if (!newProjectName) {
            setMessage('Project name required');
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:8001/projects/create?name=${encodeURIComponent(newProjectName)}&description=${encodeURIComponent(newProjectDesc)}`,
                { method: 'POST' }
            );
            const data = await response.json();

            if (data.status === 'created') {
                setMessage(`Created project: ${newProjectName}`);
                setShowCreateProject(false);
                setNewProjectName('');
                setNewProjectDesc('');
                setTargetProject(newProjectName); // Set target to new project
            } else {
                setMessage(data.detail || 'Failed to create project');
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const switchProject = async () => {
        if (targetProject === projects.current_project) return;

        setSwitching(true);
        setMessage(`Switching to ${targetProject}...`);

        try {
            const response = await fetch(
                `http://localhost:8001/projects/switch?project=${encodeURIComponent(targetProject)}`,
                { method: 'POST' }
            );
            const data = await response.json();

            if (data.status === 'switched' || data.status === 'already_active') {
                setMessage(`Switched to project: ${targetProject}`);
            } else {
                setMessage(data.detail || 'Failed to switch project');
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setSwitching(false);
            setShowProjectControls(false);
        }
    };

    const callEndpoint = async (endpoint, flashSetter) => {
        try {
            const response = await fetch(`http://localhost:8000/${endpoint}`, {
                method: 'POST',
            });
            const data = await response.json();
            if (flashSetter) {
                flashSetter(true);
                setTimeout(() => flashSetter(false), 500);
            }
            // If we reset, completed jobs is 0
            if (endpoint === 'reset') {
                setStatus(prev => ({ ...prev, completed_jobs: 0 }));
            }
            if (data.message) setMessage(data.message);
        } catch (error) {
            setMessage(`Error calling ${endpoint}: ${error.message}`);
        }
    };

    // Calculate derived state
    const canMakePlan = selectedPlan && !gitStatus.uncommitted_files.length;
    const canDispatch = status.planned_jobs > 0 && !gitStatus.uncommitted_files.length;

    return (
        <div>
            <h1>Work Orchestration</h1>

            {/* Git Status Box */}
            <div style={{
                marginBottom: '20px',
                padding: '10px',
                border: '2px solid ' + (gitStatus.is_clean ? '#28a745' : '#ffc107'),
                background: gitStatus.is_clean ? '#d4edda' : '#fff3cd'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>0. Git Status</h2>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '10px', fontSize: '1.1em' }}>
                            Current Project: <strong>{projects.current_project}</strong>
                        </span>
                        <button
                            onClick={() => setShowProjectControls(!showProjectControls)}
                            style={{ padding: '5px 10px', fontSize: '1.2em', cursor: 'pointer' }}
                            title="Manage Projects"
                            disabled={switching}
                        >
                            ⚙️
                        </button>
                    </div>
                </div>

                {/* Project Controls (Hidden behind gear) */}
                {showProjectControls && (
                    <div style={{ marginBottom: '15px', padding: '15px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <label style={{ fontWeight: 'bold' }}>Switch To: </label>
                            <select
                                value={targetProject}
                                onChange={(e) => setTargetProject(e.target.value)}
                                disabled={switching}
                                style={{ padding: '5px', minWidth: '200px' }}
                            >
                                {projects.projects.map(p => (
                                    <option key={p.name} value={p.name}>
                                        {p.name} {p.description ? `- ${p.description}` : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={switchProject}
                                disabled={switching || targetProject === projects.current_project}
                                style={{ padding: '5px 15px', fontWeight: 'bold' }}
                            >
                                Switch
                            </button>
                            <div style={{ flexGrow: 1 }}></div>
                            <button
                                onClick={() => setShowCreateProject(true)}
                                disabled={switching}
                                style={{ padding: '5px 10px', fontSize: '0.9em' }}
                            >
                                + New Project
                            </button>
                        </div>
                        {switching && <p style={{ color: '#856404', fontSize: '0.9em', marginTop: '10px' }}>⏳ Switching projects...</p>}
                    </div>
                )}

                {/* Create Project Modal */}
                {showCreateProject && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '400px' }}>
                            <h3>Create New Project</h3>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Name: </label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="project_name"
                                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label>Description: </label>
                                <input
                                    type="text"
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    placeholder="Optional description"
                                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                />
                            </div>
                            <button onClick={createProject} style={{ marginRight: '10px' }}>Create</button>
                            <button onClick={() => setShowCreateProject(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Git Status */}
                {gitStatus.is_clean ? (
                    <div>
                        <p style={{ color: '#155724', fontWeight: 'bold' }}>
                            ✓ Repository Clean
                        </p>
                        <p style={{ fontSize: '0.9em', margin: '5px 0' }}>
                            Commit: {gitStatus.current_commit?.hash?.substring(0, 8)}
                        </p>
                        {gitStatus.is_detached && (
                            <div style={{ marginTop: '10px', padding: '8px', background: '#fff3cd', border: '1px solid #ffc107' }}>
                                <strong>ℹ️ Detached HEAD</strong>
                                <p style={{ margin: '5px 0', fontSize: '0.85em' }}>
                                    You're viewing an old commit for reproducibility.
                                    Results will be read-only (no collection).
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <p style={{ color: '#856404', fontWeight: 'bold' }}>
                            ⚠️ Repository Dirty
                        </p>
                        <p style={{ fontSize: '0.9em', margin: '5px 0' }}>
                            {gitStatus.uncommitted_files.length} uncommitted file(s)
                        </p>
                        <details style={{ marginTop: '10px' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                View Files
                            </summary>
                            <ul style={{ marginTop: '5px', fontSize: '0.85em' }}>
                                {gitStatus.uncommitted_files.map((file, idx) => (
                                    <li key={idx}><code>{file}</code></li>
                                ))}
                            </ul>
                        </details>
                        <div style={{ marginTop: '10px', padding: '10px', background: '#fff', border: '1px solid #ffc107' }}>
                            <strong>⚠️ Warning:</strong> Making plans, dispatching, or collecting requires a clean repository.
                            <br />
                            <strong>Solution:</strong> Commit your changes before proceeding.
                        </div>
                    </div>
                )}
            </div>

            {/* Planning Section */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h2>1. Planning</h2>
                <p className={flashPlan ? 'flash' : ''}>
                    Planned Jobs: <strong>{status.planned_jobs}</strong>
                </p>

                <div style={{ marginBottom: '10px' }}>
                    <label>Select Plan: </label>
                    <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                    </select>
                </div>

                {selectedPlan && plans.find(p => p.id === selectedPlan)?.inputs.map(input => {
                    // Combine all files into one list
                    const allFiles = [...files.corpus, ...(files.analysis_dirs || [])];

                    return (
                        <div key={input.name} style={{ marginBottom: '10px' }}>
                            <label>{input.name}: </label>
                            <select
                                value={fileInputs[input.name] || ''}
                                onChange={(e) => setFileInputs({ ...fileInputs, [input.name]: e.target.value })}
                            >
                                <option value="">Select file...</option>
                                {allFiles.map(file => (
                                    <option key={file.path} value={file.path}>{file.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}

                <button
                    onClick={makePlan}
                    disabled={!canMakePlan}
                >
                    Make Plan
                </button>
                <button onClick={() => callEndpoint('flush-plan')}>
                    Flush Plan
                </button>
            </div>

            {/* Work Control Section */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h2>2. Work Control</h2>
                <p className={flashQueue ? 'flash' : ''}>
                    Queued Jobs: <strong>{status.queued_jobs}</strong>
                </p>
                <p>Outstanding Jobs: <strong>{status.outstanding_jobs || 0}</strong></p>
                <p>State: <strong>{status.work_state}</strong></p>

                <button
                    onClick={() => callEndpoint(status.work_state === 'playing' ? 'pause' : 'play')}
                >
                    {status.work_state === 'playing' ? 'Pause' : 'Play'}
                </button>
                <button
                    onClick={() => callEndpoint('dispatch', setFlashQueue)}
                    disabled={!canDispatch}
                >
                    Dispatch
                </button>
                <button onClick={() => callEndpoint('flush-queue')}>
                    Flush Queue
                </button>
            </div>

            {/* Completion Section */}
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h2>3. Completion</h2>
                <p className={flashComplete ? 'flash' : ''}>
                    Completed Jobs: <strong>{status.completed_jobs}</strong>
                </p>
                {status.current_plan && (
                    <p>Output: <strong>{status.current_plan.output_dir}/{status.current_plan.output_file}_*.jsonl</strong></p>
                )}

                <div style={{ marginBottom: '10px' }}>
                    <label>Label (optional): </label>
                    <input
                        type="text"
                        value={collectLabel}
                        onChange={(e) => setCollectLabel(e.target.value)}
                        placeholder="e.g., test_run"
                    />
                </div>

                {gitStatus.is_clean ? (
                    <button onClick={collectResults} disabled={status.completed_jobs === 0}>
                        Collect Results
                    </button>
                ) : (
                    <>
                        <button onClick={collectWithStash} disabled={status.completed_jobs === 0}>
                            Stash & Collect
                        </button>
                        <button
                            onClick={forceCollect}
                            disabled={status.completed_jobs === 0}
                            style={{ background: '#dc3545', color: 'white' }}
                        >
                            Force Collect (DIRTY)
                        </button>
                    </>
                )}

                <button onClick={() => callEndpoint('reset')}>
                    Flush Results
                </button>
            </div>

            {/* Status Message */}
            {message && <p><em>{message}</em></p>}
        </div>
    );
}
