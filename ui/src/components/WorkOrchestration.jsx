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

    const handleMakePlan = async () => {
        if (!selectedPlan) return;

        // Auto-select first corpus if available
        let corpusPath = 'corpus.jsonl';
        if (files && files.corpus && files.corpus.length > 0) {
            corpusPath = files.corpus[0].path;
        }

        try {
            const response = await fetch('http://localhost:8000/make-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: selectedPlan,
                    inputs: { corpus: corpusPath }
                })
            });
            const data = await response.json();
            setFlashPlan(true);
            setTimeout(() => setFlashPlan(false), 500);

            if (data.status === 'success') {
                setMessage(data.message);
                // Refresh status to show planned jobs
                const statusRes = await fetch('http://localhost:8000/status');
                const statusData = await statusRes.json();
                setStatus(statusData);
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            setMessage(`Error making plan: ${error.message}`);
        }
    };

    // Calculate derived state
    const canMakePlan = selectedPlan && !gitStatus.uncommitted_files.length;
    const canDispatch = status.planned_jobs > 0 && !gitStatus.uncommitted_files.length;
    const isPlaying = status.work_state === 'playing';
    const isPaused = status.work_state === 'paused';

    // Collection logic
    const hasResultsInMemory = status.completed_jobs > 0;
    const isSystemIdle = status.queued_jobs === 0 && status.outstanding_jobs === 0;
    const readyToCollect = hasResultsInMemory && isSystemIdle;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>

                {/* --- NAVIGATION BAR --- */}
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
                                                        href={`vscode://file//Users/virgil/Developer/nlp_lab_3_lite/${f}`}
                                                        title="Open in VS Code"
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

                {/* --- CORE MASONRY LAYOUT --- */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>

                    {/* 1. PLANNING & DISPATCH */}
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
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9em' }}>Select Plan Strategy</label>
                                    <select
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
                                </div>
                                {/* File Inputs logic implies we assume 'corpus' for now based on legacy code, 
                                but truly dynamic inputs would map `files` here. Keeping it simpl-ish for current state */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9em' }}>Corpus</label>
                                    <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
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
                                    onClick={() => callEndpoint('dispatch', setFlashQueue)}
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
                                    onClick={() => callEndpoint('flush-plan', setFlashPlan)}
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

                    {/* 2. WORK CONTROL */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: flashQueue ? '0 0 0 4px rgba(227,116,0,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
                        transition: 'box-shadow 0.3s'
                    }}>
                        <h2 style={{
                            margin: 0,
                            padding: '15px 25px',
                            background: '#e37400',
                            color: 'white',
                            fontSize: '1.1em'
                        }}>
                            2. Work Control
                        </h2>

                        <div style={{ padding: '25px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '30px' }}>
                                    <div>
                                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#1a73e8' }}>{status.queued_jobs}</div>
                                        <div style={{ fontSize: '0.8em', color: '#666', textTransform: 'uppercase' }}>Queued</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#e37400' }}>{status.outstanding_jobs}</div>
                                        <div style={{ fontSize: '0.8em', color: '#666', textTransform: 'uppercase' }}>Outstanding</div>
                                    </div>
                                    <div style={{ paddingLeft: '20px', borderLeft: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            background: isPlaying ? '#e6f4ea' : '#fce8e6',
                                            color: isPlaying ? '#137333' : '#c5221f',
                                            fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            {isPlaying ? '▶ RUNNING' : '⏸ PAUSED'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button
                                        onClick={() => callEndpoint(isPlaying ? 'pause' : 'play')}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'white',
                                            border: `2px solid ${isPlaying ? '#d93025' : '#137333'}`,
                                            color: isPlaying ? '#d93025' : '#137333',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '1em',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            minWidth: '140px',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {isPlaying ? '⏸ Pause Work' : '▶ Resume Work'}
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', textAlign: 'right' }}>
                                <button onClick={() => callEndpoint('flush-queue', setFlashQueue)} style={{ color: '#d93025', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}>
                                    Flush Queue
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3. COMPLETION */}
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
                                <button onClick={() => callEndpoint('reset', setFlashComplete)} style={{ color: '#d93025', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85em' }}>
                                    Reset / Flush
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Project Modal */}
                {showCreateProject && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000
                    }}>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', minWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ marginTop: 0 }}>Create New Project</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="project_name_snake_case"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                />
                            </div>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                                <input
                                    type="text"
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    placeholder="What is this project?"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button onClick={() => setShowCreateProject(false)} style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={createProject} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Create Project</button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Closing divs for new layout */}
            </div>
        </div>
    );
}
