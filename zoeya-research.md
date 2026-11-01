Astronaut Health Monitoring Research

AstroOrbitX research contribution

Prepared for the AstroOrbitX team | Zoeya | Updated 30 October 2026

## Purpose and main recommendation

This report covers cardiovascular health, sleep and fatigue, and psychological wellbeing. It explains why these areas matter in spaceflight and how a small health-monitoring prototype could represent them clearly. The recommended starting point is a dashboard that records measurements and daily check-ins, displays changes over time, and explains why a record needs review.

This is a research summary and development guide based on published sources. It contains no original astronaut experiment or validated diagnostic model. NASA findings are cited using numbered references; proposed software features and demonstration rules are identified separately.

## Contents

1  Cardiovascular health

2  Sleep and fatigue

3  Psychological wellbeing

4  Implementation and testing

5  References

## How the three topics fit together

| **Topic** | **Suggested starting feature** |
| --- | --- |
| Cardiovascular health | Heart rate and blood pressure history with activity context. |
| Sleep and fatigue | Daily sleep log with sleep quality and fatigue check-ins. |
| Psychological wellbeing | Private mood and stress check-ins with a support request option. |

## Evidence and data boundaries

The sources establish that these are relevant health areas; they do not validate AstroOrbitX’s proposed scoring system. This review did not establish universal NASA-approved numerical cutoffs for Normal, Attention, or Urgent across these indicators. Medical interpretation would require mission context and qualified clinical oversight.

No individual astronaut health records were obtained or analysed. Use clearly labelled synthetic records for the demonstration. Published group averages are background evidence and must not be presented as an individual astronaut’s measurements or a prediction dataset.

# 1 Cardiovascular health

## What it means and why it matters

Cardiovascular health concerns the heart and blood vessels. NASA observes headward fluid shifts, reduced blood volume, and postflight difficulty tolerating upright posture. Its laboratory uses blood-pressure monitoring, ECG, ultrasound, and tolerance tests to investigate these changes. [1]

NASA identifies cardiovascular adaptations as a concern for longer missions. Exercise is one countermeasure used to help maintain cardiovascular fitness. This supports including cardiovascular observations in AstroOrbitX, although the prototype cannot reproduce NASA’s complete medical assessment. [2]

## How adaptation develops in microgravity

On Earth, upright posture creates a head-to-foot fluid distribution. In orbit, the body is in continuous free fall, so this familiar loading is largely absent. Fluid moves toward the chest and head; the cardiovascular system adapts to a different distribution rather than continuing to work exactly as it does while standing on Earth. NASA describes reduced circulatory function and blood volume during this adaptation. A change that is tolerated while floating can become a problem after landing. [9]

Fluid redistribution and reduced blood volume are related but distinct. Redistribution describes where fluid moves; reduced volume describes a later change in the amount circulating. The initial upper-body fullness therefore does not mean that total blood volume stays high. NASA describes the body responding to the relative upper-body increase by reducing total blood volume. [1]

## Orthostatic intolerance after landing

Orthostatic intolerance is difficulty remaining upright because circulation does not adequately meet the demands of that position. After landing, gravity again draws fluid toward the legs. A circulation adapted to microgravity may struggle to maintain blood pressure, producing weakness, dizziness, or fainting. NASA reports that symptoms can continue for several days during readaptation. [9]

For mission planning, this matters because standing, walking, and leaving a vehicle may be necessary soon after landing. This is an operational implication of the findings, not a prediction that every astronaut will faint. NASA describes compression garments and medically managed fluid intake before landing as countermeasures. These require a mission medical protocol rather than an automated suggestion from our app. [2]

## What is established and what remains uncertain

Headward fluid shifts and postflight difficulty tolerating upright posture are established observations. NASA continues to investigate the response to the partial-gravity transitions expected at the Moon and Mars. We should not assume that an ISS result fully predicts landing performance in those settings. [1]

# Cardiovascular monitoring and countermeasures

## Suggested information to collect

| **Information** | **Unit or format** | **Why record it** |
| --- | --- | --- |
| Heart rate | Beats per minute or bpm | Track readings over time. |
| Blood pressure | Systolic and diastolic in mmHg | Keep both values from the same reading. |
| Activity context | Resting, exercise, recovery, unknown | Avoid treating unlike conditions as equivalent. |
| Symptoms | Optional structured checkboxes | Add reported context to the numbers. |
| Measurement details | Time, source, quality, mission phase | Identify stale or unreliable records. |

## What the monitoring methods can show

NASA lists ambulatory ECG, ambulatory blood-pressure monitoring, ultrasound, and orthostatic-tolerance tests among its cardiovascular methods. [1] ECG records the heart’s electrical activity and allows a reviewer to examine rate and rhythm. Blood-pressure monitoring records pressure at the time of measurement; ultrasound provides images of the heart or vessels and can assess blood flow. These methods answer different questions. [9, 18]

A pulse number in our database is not an ECG trace. A pressure reading is not an ultrasound assessment of pumping function. Our first version can store heart rate and blood pressure and link a clinician-reviewed test report; it should not claim to perform these investigations itself.

## Exercise as a countermeasure

Aerobic exercise on a treadmill or cycle challenges oxygen delivery and endurance, while resistance exercise supplies loading that is reduced in weightlessness. NASA describes the T2 treadmill, CEVIS cycling system, and ARED resistance device. Its overview also explains that available time, equipment, and individual responses affect exercise planning. [10]

In the NASA Sprint study, 9 astronauts followed a higher-intensity, lower-volume programme and 17 followed standard exercise. Overall physiological outcomes were not appreciably different, and cardiorespiratory fitness still declined after flight in both groups. This supports studying efficient exercise prescriptions; it does not show that exercise prevents every cardiovascular change. The small groups also limit broad generalisation. [11]

## Proposed dashboard behaviour

Show valid heart-rate and blood-pressure readings with their timestamps. Keep systolic pressure, during a heartbeat, and diastolic pressure, between beats, clearly labelled. Compare resting readings with previous resting readings; explain when activity context is missing.

Our baseline means a person’s usual pattern under comparable conditions. Keep exercise, recovery, and rest distinct rather than interpreting every raised pulse in the same way.

## Limits and appropriate guidance

Heart rate and blood pressure alone cannot identify a blood clot, diagnose a rhythm disorder, or establish the cause of a change. A single reading is not a complete cardiovascular assessment. The software should report observations such as “Reading differs from your recorded resting pattern” and direct concerns to the designated medical reviewer.

Medical treatment and exercise prescriptions require the mission medical team. Numeric alerts remain demonstration settings until an appropriate protocol is established.

# 2 Sleep and fatigue

## What it means and why it matters

Sleep duration is the amount of time actually asleep. Sleep quality describes how restful or interrupted that sleep was. Fatigue is reduced energy or alertness; it cannot be measured completely from sleep duration alone. Circadian rhythm means the body’s daily timing system.

NASA identifies sleep loss, disruption of the body clock, and workload as risks to health and task performance. Noise, lighting, temperature, and vibration can interfere with sleep. This makes a sleep log useful alongside observations about tiredness and working conditions. [3]

Barger and colleagues studied sleep using activity-monitoring devices and sleep diaries during shuttle and ISS missions. The ISS group averaged about 6.09 hours of sleep per night during flight. This is a finding from that study, not a recommended target or a prediction for every astronaut. It was observational research, so its average cannot define an individual’s safe operating limit. [4]

NASA’s account of station sleep research supports using personal baseline comparisons and complementary monitoring methods. [5]

## How the environment and schedule affect sleep

Microgravity changes the physical conditions of sleep, but its effects occur alongside lighting, noise, workload, and schedule changes. It would be inaccurate to attribute every poor night to gravity alone. NASA studies sleep physiology using devices such as ear EEG and headbands, alongside daily records. [5]

Light affects when the body expects to be awake or asleep. Noise can interrupt sleep; temperature and vibration can also make the environment less suitable. Docking operations and other mission demands can move sleep into a time when the person’s body clock promotes wakefulness. NASA identifies these environmental and scheduling pressures as contributors to fatigue and performance risk. [3, 12]

## Understanding circadian disruption

A sleep opportunity is scheduled time available for sleep. Circadian misalignment means that this time conflicts with internal biological timing: work may fall during the biological night, and sleep during the biological day. [12]

Flynn-Evans and colleagues studied 21 ISS astronauts, estimating circadian timing from activity and light data rather than directly measuring the internal clock. About 19% of in-flight sleep episodes were misaligned. Sleep averaged 5.4 hours when misaligned versus 6.4 hours when aligned, with poorer reported quality during misalignment. These associations are not diagnostic thresholds. [12]

# Sleep performance and monitoring

## Additional evidence about performance

Jones and colleagues followed 24 astronauts around six-month ISS missions, combining reported sleep and stress with a brief visual reaction-time test. Shorter sleep was associated with slower responses and higher stress. This supports concern about sustained attention; it does not measure every aspect of decision-making or prove that a particular operational error was caused by sleep loss. [13]

NASA describes broader concerns about attention, concentration, memory, problem-solving, and judgement following poor sleep. For AstroOrbitX, this supports explaining why repeated sleep concerns deserve review. It does not justify calculating a percentage risk of a bad decision from diary entries. [5]

## Three concepts that should remain separate

Sleep deprivation concerns too little sleep. Poor sleep quality concerns disrupted or unrefreshing sleep, even when enough time was available. Fatigue concerns the resulting or accompanying lack of energy and alertness, which can also reflect workload and stress. A person can report one without reporting all three, so our interface should record each separately. [3]

## Suggested information to collect

| **Information** | **Suggested format** |
| --- | --- |
| Main sleep and naps | Start and end timestamps, plus estimated time actually asleep. |
| Daily sleep total | Hours per defined 24-hour reporting window; include naps once. |
| Sleep quality | 1 to 5, where 1 means very poor and 5 means very good. |
| Fatigue | 1 to 5, where 1 means none and 5 means extreme. |
| Context | Interruptions, schedule changes, source, and timestamp. |

## Proposed dashboard behaviour

Display sleep totals, quality, and fatigue together. Use full timestamps for overnight sleep. Label the reporting timezone and the number of valid days behind each average; show a full seven-day average only when seven valid daily records exist.

Example: a synthetic crew member records 5.5, 5.0, and 5.5 hours on three consecutive days and fatigue of 4 out of 5. Display the pattern and suggest a workload or sleep-schedule review. Any rule that flags this example is a team-designed demonstration rule, not a NASA diagnostic threshold.

## Limits of diaries and self reported fatigue

Diaries depend on recall and regular completion; time in bed may include wakefulness, and a diary cannot identify sleep stages. Perceived fatigue is not an objective performance test. Jones and colleagues acknowledge reported sleep, missing records, limited continuous monitoring, and an observational design that cannot establish causality. [13]

Activity-based sleep estimates add another view but are not equivalent to an EEG sleep assessment. The Barger study combined objective activity monitoring with subjective logs, showing why complementary methods are useful. [4]

NASA’s medical-operations guidance includes consistent sleep opportunities, workload assessment, and fatigue management. Timed light and sleep-schedule changes require appropriate expertise; the app can record them without prescribing them. [8]

The app can suggest reviewing sleep opportunity and interruptions. It should not recommend sleeping medication or certify fitness for critical tasks. Our 1-to-5 ratings are demonstration inputs rather than validated clinical scales.

# 3 Psychological wellbeing

## What it means and why it matters

Psychological wellbeing includes mood, coping, and the ability to function under stress. Isolation means separation from usual social support; confinement means living and working within a restricted space. NASA identifies these conditions as spaceflight hazards and studies ways to monitor and support behavioural health. [6]

NASA explains that prolonged isolation and confinement can increase risks of anxiety, depression, and behavioural difficulties. Effects may involve sleep, morale, and decision-making. It also highlights privacy and contact with family and medical professionals, while noting that deep-space communication delays will complicate support. These risks do not mean that every astronaut develops a psychiatric condition. [7]

## Isolation confinement and relationships

Separation from familiar support and repeatedly sharing a small working and living space create different pressures. Isolation reduces access to usual relationships; confinement reduces opportunities to obtain personal space. Repetitive routines and sustained workload can add to the burden. NASA studies combinations of these conditions in HERA and CHAPEA analog missions on Earth. Analog findings help test ideas, but they are not identical to observations from a real deep-space mission. [6]

NASA identifies mood and behavioural changes as possible consequences of mission stressors. Teamwork training therefore addresses communication, conflict management, and caring for other crew members. Interpersonal friction should be considered a team-function issue to understand, rather than automatic evidence of illness. [15]

Stress, irritability, withdrawal, or tension may interfere with cooperation, but the cause cannot be determined from a single score. A useful research question is whether changes persist across check-ins and coincide with workload, sleep disruption, or relationship difficulties. This is a proposed interpretation framework for our prototype, not a validated model.

## Separation from family and delayed communication

ISS astronauts can communicate with family and health professionals on Earth. On deep-space missions, communication delay will make immediate conversation and real-time professional support harder. A difficult event at home may therefore be harder to discuss promptly. NASA treats the longer separation and communication limitations as reasons to adapt support for exploration missions. [7]

NASA describes family contact, personal care packages, and private medical or psychological conferences as ways to support connection. For a delayed link, stored messages can preserve contact even when live conversation is impractical. The app should show whether a support request is pending, transmitted, or acknowledged; saving it locally must not imply that someone has received it. [7, 15]

## Normal emotional changes and clinical concerns

A temporary low mood or frustration can occur without a psychiatric disorder. A clinical assessment considers severity, persistence, distress, functioning, and other possible causes. NIMH describes major depression as involving persistent depressed mood or loss of interest, with symptoms lasting at least two weeks and interfering with daily activities. This example is general clinical guidance, not an astronaut-specific diagnostic rule. A person may need help sooner; the app must never require a two-week wait. [16]

# Psychological support and private monitoring

## Support used in spaceflight and under study

NASA’s behavioural-health operations include individual and family support, team training, private psychological conferences, and computer-based assessment. These are professional services around the astronaut, not tasks a simple mood dashboard can replace. [14]

NASA describes routines, leisure, exercise, journalling, mindfulness, and conflict de-escalation training as coping approaches used or discussed for isolation. Virtual-reality approaches are also being investigated. These strategies can support coping but do not establish that a clinical condition has been treated. [15]

NASA reports that ISS selection, training, and countermeasures have largely mitigated behavioural-health risk, while constrained resources beyond low Earth orbit limit how directly these approaches can transfer. Effective, acceptable support for exploration missions remains an area needing further development and validation. [17]

## Suggested information to collect

| **Information** | **Suggested format** |
| --- | --- |
| Mood | 1 to 5, where 1 means very low and 5 means very good. |
| Stress | 1 to 5, where 1 means very low and 5 means very high. |
| Social connection | Optional 1-to-5 rating with clearly written endpoints. |
| Support request | A separate request for a private check-in. |
| Record details | Timestamp and optional private note. |

All ratings above are proposed demonstration inputs. They are not a NASA questionnaire or a validated depression or anxiety screening tool. Participation should be clearly explained, and the person should be able to skip an optional question.

## Proposed dashboard behaviour

Offer a short private daily check-in. Show changes in a person’s own reported mood and stress without ranking crew members. Keep a direct support request separate from any calculated score so that a person can ask for help even when no trend is available.

Repeated low mood and high stress could prompt a private check-in under a documented demonstration rule. Never label this “Depression detected” or interpret a missed check-in as good wellbeing.

## Privacy and support

NASA requires private medical and psychological communications and scheduled support. Our shared dashboard should therefore limit exposure of sensitive information. [8]

Use synthetic identities and notes in the demonstration. If access control is unavailable, omit sensitive notes from the shared interface.

## Proposed privacy safeguards

Proposed safeguards include access restricted to the crew member and authorised health staff, authentication, protected storage and transmission, access logs, and a retention policy. Explain any emergency-access process. These recommendations are not a claim that AstroOrbitX has implemented NASA requirements.

Avoid publishing notes or ranking crew members. Even nameless summaries can identify people in a small crew. A reviewer should check shared summaries for that risk.

## Limits and appropriate guidance

A self-report reflects what someone chooses to report at a particular time. Low stress does not prove that no problem exists, and high stress does not establish a disorder. Appropriate outputs offer private support and human review. An immediate request for help should follow the designated support process rather than wait for more daily records.

# 4 Implementation and testing

## A simple workflow for the prototype

Collect a measurement or check-in with an astronaut identifier, timestamp, unit or scale, source, and any necessary context.

Validate the record before interpreting it. Reject malformed values; keep missing information distinct from a measured zero.

Display valid records in time order. Keep activity context, data freshness, and incomplete coverage visible.

Apply documented demonstration rules. Show the reason, affected indicator, and rule version beside each result.

Offer an appropriate next step, such as checking the measurement or requesting human review.

## Meaning of the four proposed statuses

| **Status** | **Proposed meaning** |
| --- | --- |
| Normal | No configured alert condition was triggered in the available valid data. This does not establish overall health. |
| Attention | A documented demonstration rule identifies a pattern or concern for review. |
| Urgent | A defined escalation condition or explicit immediate-help request requires prompt human attention. Do not invent a medical cutoff from this report. |
| Insufficient Data | The specific assessment lacks required valid, current data or context. Explain what is missing. |

Compute data completeness separately from alert severity. For example, a cardiovascular concern must remain visible even when sleep data are missing. Missing information must not cancel an existing alert. Numeric limits, freshness windows, and persistence rules need a written specification before implementation; they are not established by the cited background research.

## Minimum QA checks

A record with an unknown unit, nonnumeric heart rate, or malformed blood-pressure pair receives a clear validation error.

An omitted rating remains missing; a rating outside the stated 1-to-5 scale is rejected.

A duplicate submission does not silently create a second observation. Document whether it is rejected or treated as the same record.

Overnight sleep is calculated correctly, and overlapping sleep episodes are not counted twice.

Exercise and resting records remain distinguishable; incomplete or stale data do not automatically appear Normal.

A support request is retained even without earlier check-ins, and unauthorised users cannot retrieve private notes.

## Conclusion

AstroOrbitX can use these three areas to organise health observations and make patterns easier to review. Its useful contribution is a clear record of measurements, context, trends, and reasons for concern. The first version should use synthetic data and transparent demonstration rules, with the limits of each indicator visible. These findings can be combined with Yasha’s contribution without claiming that the prototype provides a clinical diagnosis or NASA-approved medical assessment.

# 5 References

Sources accessed on 30 October 2026. Bracketed numbers in the report identify the sources supporting the scientific statements. URLs below provide direct access. Software suggestions and QA cases are proposed for AstroOrbitX and have not been validated by these sources.

**[1] NASA. Cardiovascular and Vision. Published 16 March 2023; updated 11 March 2025.**

https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision/

Supports the explanation of headward fluid shifts, reduced blood volume, orthostatic intolerance, and laboratory measurement methods.

**[2] NASA. Risk of Cardiovascular Adaptations.**

https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/

Supports cardiovascular risk relevance and exercise as a countermeasure.

**[3] NASA. Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload. Updated 16 September 2025.**

https://www.nasa.gov/directorates/esdmd/hhp/risk-of-performance-decrements-and-adverse-health-outcomes-resulting-from-sleep-loss-circadian-desynchronization-and-work-overload/

Supports the sleep, environment, workload, and performance discussion.

**[4] Barger LK et al. Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight: an observational study. The Lancet Neurology. 2014;13(9):904–912. DOI 10.1016/S1474-4422(14)70122-X.**

https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/

Original observational research supporting the reported ISS sleep average and measurement methods.

**[5] NASA. Science in Space Week of Sept 15 2023 Sleep on Station. Published 18 September 2023.**

https://www.nasa.gov/humans-in-space/science-in-space-week-of-sept-15-2023-sleep-on-station/

Describes sleep studies, baseline comparisons, questionnaires, and fatigue-related performance findings.

**[6] NASA. Hazard Isolation and Confinement.**

https://www.nasa.gov/hrp/hazard-isolation-and-confinement/

Supports the relevance of isolation and confinement and behavioural-health research.

**[7] NASA. Risk of Behavioral Changes and Psychiatric Disorders. Updated 24 February 2026.**

https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/

Supports behavioural-health risks, privacy, social support, and deep-space communication limitations.

**[8] NASA. NASA STD 3001 Volume 1 Section 6 Medical Operations. See sections 6.2 and 6.3.**

https://www.nasa.gov/reference/6-0-medical-operations/

Supports private medical and psychological communications and behavioural-health support.

**[9] NASA. Station Science 101 Cardiovascular Research on Station. 21 March 2024.**

https://www.nasa.gov/general/station-science-101-cardiovascular-research-on-station/

NASA research overview supporting adaptation, postflight symptoms, and ultrasound investigations.

# References continued

**[10] NASA. Astronaut Exercise.**

https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/

NASA overview of exercise hardware, training constraints, and variable countermeasure outcomes.

**[11] English KL et al. High intensity training during spaceflight results from the NASA Sprint Study. npj Microgravity. 2020;6:21. DOI 10.1038/s41526-020-00111-x.**

https://www.nature.com/articles/s41526-020-00111-x

Original research comparing exercise programmes; supports the discussion of benefits and remaining fitness loss.

**[12] Flynn-Evans EE et al. Circadian misalignment affects sleep and medication use before and during spaceflight. npj Microgravity. 2016;2:15019. DOI 10.1038/npjmgrav.2015.19.**

https://pmc.ncbi.nlm.nih.gov/articles/PMC5515517/

Original observational research; circadian timing was estimated using activity and light data.

**[13] Jones CW et al. Sleep deficiency in spaceflight is associated with degraded neurobehavioral functions and elevated stress in astronauts on six-month missions aboard the International Space Station. Sleep. 2022;45(3):zsac006. DOI 10.1093/sleep/zsac006.**

https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/

Original longitudinal observational study of 24 astronauts; supports response-speed findings and methodological limitations.

**[14] NASA. Behavioral Health and Performance. Johnson Space Center.**

https://www.nasa.gov/reference/jsc-behavioral-health/

Describes operational support for astronauts and families and behavioural-health assessment.

**[15] NASA. Isolation What Can We Learn From the Experiences of NASA Astronauts. 15 June 2020.**

https://www.nasa.gov/humans-in-space/isolation-what-can-we-learn-from-the-experiences-of-nasa-astronauts/

Describes connection with home, coping strategies, routines, and team skills; distinguishes approaches being investigated.

**[16] National Institute of Mental Health. Depression. Revised 2024. NIH Publication 24 MH 8079.**

https://www.nimh.nih.gov/health/publications/depression

General clinical guidance supporting the distinction between low mood and a depressive condition; not an astronaut diagnostic protocol.

**[17] NASA. Behavioral Health Risk. Updated 17 September 2025.**

https://www.nasa.gov/directorates/esdmd/hhp/behavioral-health-risk/

Describes current mitigation and limits on transferring countermeasures to exploration missions.

**[18] National Library of Medicine. MedlinePlus Electrocardiogram.**

https://medlineplus.gov/lab-tests/electrocardiogram/

Explains ECG electrical signals, rate, rhythm, and why an ECG trace provides information beyond a pulse number.

---
*AstroOrbitX | Research contribution by Zoeya*