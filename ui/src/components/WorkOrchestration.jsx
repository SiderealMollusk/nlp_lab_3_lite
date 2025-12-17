import { useState, useEffect } from 'react';
import NavBar from './orchestration/NavBar';
import PlanningCard from './orchestration/PlanningCard';
import ControlCard from './orchestration/ControlCard';
import CompletionCard from './orchestration/CompletionCard';
import ProjectModal from './orchestration/ProjectModal';

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
    const [config, setConfig] = useState({ project_root: '' });
    const [fileInputs, setFileInputs] = useState({});
    const [collectLabel, setCollectLabel] = useState('');
    const [lastResult, setLastResult] = useState(null);

    // Fetch config
    useEffect(() => {
        fetch('http://localhost:8000/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error('Error fetching config:', err));
    }, []);

    // Fetch initial status and plans
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
                if (data.filename && data.path) {
                    setLastResult({ filename: data.filename, path: data.path });
                }
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
        try {
            const response = await fetch(`http://localhost:8001/projects/switch?project=${encodeURIComponent(targetProject)}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.status === 'success') {
                setMessage(`Switched to: ${targetProject}`);
                setShowProjectControls(false);
                setCollectLabel('');
            } else {
                setMessage(data.detail || 'Switch failed');
            }
        } catch (error) {
            setMessage(`Switch error: ${error.message}`);
        } finally {
            setSwitching(false);
        }
    };

    const callEndpoint = async (endpoint, flashSetter = null) => {
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

    // Collection logic
    const hasResultsInMemory = status.completed_jobs > 0;
    const isSystemIdle = status.queued_jobs === 0 && status.outstanding_jobs === 0;
    const readyToCollect = hasResultsInMemory && isSystemIdle;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>
                <NavBar
                    gitStatus={gitStatus}
                    config={config}
                    projects={projects}
                    targetProject={targetProject}
                    setTargetProject={setTargetProject}
                    showProjectControls={showProjectControls}
                    setShowProjectControls={setShowProjectControls}
                    switching={switching}
                    switchProject={switchProject}
                    setShowCreateProject={setShowCreateProject}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                    <PlanningCard
                        status={status}
                        plans={plans}
                        selectedPlan={selectedPlan}
                        setSelectedPlan={setSelectedPlan}
                        files={files}
                        handleMakePlan={handleMakePlan}
                        canMakePlan={canMakePlan}
                        canDispatch={canDispatch}
                        onDispatch={() => callEndpoint('dispatch', setFlashQueue)}
                        onClear={() => callEndpoint('flush-plan', setFlashPlan)}
                        flashPlan={flashPlan}
                        setPlans={setPlans}
                        config={config}
                        setMessage={setMessage}
                    />

                    <ControlCard
                        status={status}
                        onToggle={(action) => callEndpoint(action)}
                        onFlush={() => callEndpoint('flush-queue', setFlashQueue)}
                        flashQueue={flashQueue}
                    />

                    <CompletionCard
                        flashComplete={flashComplete}
                        hasResultsInMemory={hasResultsInMemory}
                        status={status}
                        lastResult={lastResult}
                        config={config}
                        collectLabel={collectLabel}
                        setCollectLabel={setCollectLabel}
                        collectResults={collectResults}
                        forceCollect={forceCollect}
                        readyToCollect={readyToCollect}
                        message={message}
                        onReset={() => callEndpoint('reset', setFlashComplete)}
                    />
                </div>

                <ProjectModal
                    isOpen={showCreateProject}
                    onClose={() => setShowCreateProject(false)}
                    name={newProjectName}
                    setName={setNewProjectName}
                    desc={newProjectDesc}
                    setDesc={setNewProjectDesc}
                    onCreate={createProject}
                />
            </div>

            {/* Debug Footer */}
            <div style={{ textAlign: 'center', marginTop: '30px', color: '#ccc', fontSize: '0.8em', fontFamily: 'monospace' }}>
                PROJECT_ROOT: {config.project_root || "(Not Detected)"} <br />
                IDE_SCHEME: {config.ide_scheme || "vscode"} <br />
                API: http://localhost:8000
            </div>
        </div>
    );
}
