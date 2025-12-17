import React from 'react';

export default function ControlCard({
    status,
    onToggle,
    onFlush,
    flashQueue
}) {
    const isPlaying = status.work_state === 'playing';

    return (
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
                            onClick={() => onToggle(isPlaying ? 'pause' : 'play')}
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
                    <button onClick={onFlush} style={{ color: '#d93025', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}>
                        Flush Queue
                    </button>
                </div>
            </div>
        </div>
    );
}
