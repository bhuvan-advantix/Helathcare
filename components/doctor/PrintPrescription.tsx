import React from 'react';

export default function PrintPrescription({
    patient, doctor, vitals, diagnoses, medications, followUp, patientNote, labTests, injections,
    newAllergies, newSurgeries, newLifestyle, summaryText
}: any) {
    const now       = new Date();
    const dateStr   = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long',  year: 'numeric' });
    const timeStr   = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const age       = patient?.dateOfBirth
        ? Math.floor((now.getTime() - new Date(patient.dateOfBirth).getTime()) / 31_557_600_000)
        : patient?.age || '';

    const doctorName     = (doctor as any)?.userName || doctor?.name || 'Doctor';
    const clinicName     = doctor?.clinicName || 'Niraiva Health Care';
    const specialization = doctor?.specialization || '';
    const degree         = doctor?.degree || doctor?.qualification || '';
    const clinicAddress  = doctor?.address
        ? `${doctor.address}${doctor.city ? ', ' + doctor.city : ''}`
        : '';
    const clinicPhone = doctor?.phoneNumber || '';

    const prescribedMeds = (medications || []).filter((m: any) => m.name?.trim() !== '' && m.isPrescribed !== false);
    const diagList: string[]  = diagnoses || [];
    const formattedVitals: { label: string; value: string }[] = [];
    if (vitals?.bloodPressure)  formattedVitals.push({ label: 'Blood Pressure',  value: `${vitals.bloodPressure} mm Hg` });
    if (vitals?.bloodGlucose)   formattedVitals.push({ label: 'Blood Glucose',   value: `${vitals.bloodGlucose} mg/dL` });
    if (vitals?.weight)         formattedVitals.push({ label: 'Weight',          value: `${vitals.weight} kg` });
    if (vitals?.height)         formattedVitals.push({ label: 'Height',          value: `${vitals.height} cm` });
    if (vitals?.cholesterol)    formattedVitals.push({ label: 'Cholesterol',     value: `${vitals.cholesterol} mg/dL` });
    if (vitals?.hba1c)          formattedVitals.push({ label: 'HbA1c',           value: `${vitals.hba1c} %` });

    return (
        <div className="hidden print:block w-full bg-white text-black font-sans text-[12px] leading-normal">
            <style dangerouslySetInnerHTML={{ __html: `
                @page { size: A4 portrait; margin: 0; }
                @media print {
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .rx-header  { background-color: #0d9488 !important; color: #fff !important; }
                    .rx-section { background-color: #0d9488 !important; color: #fff !important; }
                    .rx-patient { background-color: #f1f5f9 !important; }
                    .rx-vital   { background-color: #f8fafc !important; }
                    .rx-note    { background-color: #fef9c3 !important; }
                    .rx-footer  { background-color: #0d9488 !important; color: #fff !important; }
                    .rx-days    { background-color: #ccfbf1 !important; color: #0d9488 !important; }
                    .rx-accent  { background-color: #0d9488 !important; }
                    .rx-icon    { background-color: #ccfbf1 !important; }
                }
                * { box-sizing: border-box; }
            `}} />

            <div style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: '#fff' }}>

                {/* ── HEADER ── */}
                <div className="rx-header" style={{ padding: '10mm 15mm 8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '1px', color: '#fff' }}>
                            {clinicName.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '4px', color: '#e0fdf4' }}>
                            Dr. {doctorName}{degree ? `  |  ${degree}` : ''}{specialization ? `  |  ${specialization}` : ''}
                        </div>
                        {(clinicAddress || clinicPhone) && (
                            <div style={{ fontSize: '9px', marginTop: '3px', color: '#e0fdf4' }}>
                                {[clinicAddress, clinicPhone].filter(Boolean).join('  |  ')}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right', color: '#e0fdf4', fontSize: '9px', marginTop: '4px' }}>
                        {dateStr},&nbsp; {timeStr}
                    </div>
                </div>

                {/* ── PATIENT INFO BAR ── */}
                <div className="rx-patient" style={{ margin: '6mm 15mm', padding: '5mm', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '13px' }}>Patient: {patient?.name || ''}</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>ID: {patient?.customId || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
                        {age ? `Age: ${age}   ` : ''}{patient?.gender ? `Gender: ${patient.gender}` : ''}
                        {followUp ? <><br />Follow-up: {followUp}</> : null}
                    </div>
                </div>

                <div style={{ padding: '0 15mm' }}>

                    {/* ── SUMMARY ── */}
                    {summaryText?.trim() && (
                        <div style={{ marginBottom: '6mm' }}>
                            <div className="rx-section" style={{ padding: '3px 8px', fontWeight: 700, fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>
                                PRESCRIPTION SUMMARY
                            </div>
                            <div style={{ padding: '4px 6px', fontSize: '10px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                {summaryText.trim()}
                            </div>
                        </div>
                    )}

                    {/* ── DIAGNOSIS ── */}
                    {diagList.length > 0 && (
                        <div style={{ marginBottom: '6mm' }}>
                            <div className="rx-section" style={{ padding: '3px 8px', fontWeight: 700, fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>
                                DIAGNOSIS
                            </div>
                            <div style={{ padding: '4px 6px', fontSize: '11px', lineHeight: '1.6' }}>
                                {diagList.map((d, i) => <span key={i} style={{ marginRight: '16px' }}>• {d}</span>)}
                            </div>
                        </div>
                    )}

                    {/* ── MEDICATIONS ── */}
                    {prescribedMeds.length > 0 && (
                        <div style={{ marginBottom: '6mm' }}>
                            <div className="rx-section" style={{ padding: '3px 8px', fontWeight: 700, fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>
                                Rx  MEDICATIONS
                            </div>
                            {prescribedMeds.map((med: any, i: number) => {
                                const timing: string[] = [];
                                if (med.morning)   timing.push('Morning');
                                if (med.afternoon) timing.push('Afternoon');
                                if (med.night)     timing.push('Night');
                                if (med.beforeFood) timing.push('Before Food');
                                if (med.afterFood)  timing.push('After Food');
                                const timeLabel = med.time || (timing.length ? timing.join(', ') : 'As directed');
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '5px 6px', background: i % 2 === 0 ? '#f8fafc' : '#fff', marginBottom: '1px' }}>
                                        <div className="rx-icon" style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', flexShrink: 0 }}>
                                            <span style={{ color: '#0d9488', fontWeight: 900, fontSize: '13px' }}>℞</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '11px' }}>{med.name}</div>
                                            <div style={{ fontSize: '9px', color: '#64748b' }}>{timeLabel}</div>
                                        </div>
                                        {med.days && (
                                            <div className="rx-days" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700 }}>
                                                {med.days} days
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── VITALS ── */}
                    {formattedVitals.length > 0 && (
                        <div style={{ marginBottom: '6mm' }}>
                            <div className="rx-section" style={{ padding: '3px 8px', fontWeight: 700, fontSize: '9px', letterSpacing: '1px', marginBottom: '6px' }}>
                                VITALS
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                {formattedVitals.map((v, i) => (
                                    <div key={i} className="rx-vital" style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div className="rx-accent" style={{ width: '3px', flexShrink: 0 }} />
                                        <div style={{ padding: '5px 8px' }}>
                                            <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{v.label}</div>
                                            <div style={{ fontWeight: 700, fontSize: '12px', color: '#0d9488', marginTop: '2px' }}>{v.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── PATIENT NOTE ── */}
                    {patientNote?.trim() && (
                        <div style={{ marginBottom: '6mm' }}>
                            <div style={{ background: '#fef9c3', padding: '6px 8px', borderRadius: '4px' }}>
                                <div style={{ fontWeight: 700, fontSize: '8px', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Instructions for Patient</div>
                                <div style={{ fontSize: '10px', color: '#713f12', whiteSpace: 'pre-wrap' }}>{patientNote.trim()}</div>
                            </div>
                        </div>
                    )}

                    {/* ── PROCEDURES / TESTS ── */}
                    {(labTests?.length > 0 || injections?.length > 0) && (
                        <div style={{ marginBottom: '6mm' }}>
                            <div className="rx-section" style={{ padding: '3px 8px', fontWeight: 700, fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>
                                PROCEDURES / TESTS
                            </div>
                            {labTests?.map((t: any, i: number) => (
                                <div key={`l${i}`} style={{ padding: '3px 6px', fontSize: '10px' }}>• Lab Test: {t.name || t}</div>
                            ))}
                            {injections?.map((inj: any, i: number) => (
                                <div key={`i${i}`} style={{ padding: '3px 6px', fontSize: '10px' }}>• Injection: {inj.name || inj}</div>
                            ))}
                        </div>
                    )}

                    {/* ── SIGNATURE ── */}
                    <div style={{ marginTop: '24mm', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center', width: '120px' }}>
                            <div style={{ borderBottom: '1px solid #cbd5e1', marginBottom: '6px', height: '20px' }} />
                            <div style={{ fontSize: '8px', color: '#64748b' }}>Doctor's Signature</div>
                            <div style={{ fontWeight: 700, fontSize: '11px', marginTop: '3px' }}>Dr. {doctorName}</div>
                            {(degree || specialization) && (
                                <div style={{ fontSize: '8px', color: '#64748b' }}>
                                    {[degree, specialization].filter(Boolean).join(' | ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="rx-footer" style={{ marginTop: '8mm', padding: '4px', textAlign: 'center', fontSize: '8px', color: '#fff' }}>
                    Generated by Niraiva Health Platform  •  www.niraivahealth.com
                </div>
            </div>
        </div>
    );
}
