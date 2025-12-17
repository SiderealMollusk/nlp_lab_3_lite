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
                fontSize: '1.1em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>2. Work Control</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.7em', color: '#e37400', background: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {status.queued_jobs} Queued
                    </span>
                    <span style={{ fontSize: '0.7em', color: '#e37400', background: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {status.outstanding_jobs} Out
                    </span>
                </div>
            </h2>

            <div style={{ padding: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
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
