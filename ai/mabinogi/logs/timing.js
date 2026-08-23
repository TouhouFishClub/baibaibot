// Timing helpers for reports produced by BlonyMonitor.
// Client timestamps are centiseconds since the Unix epoch.

function finiteNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function collectHitTimestamps(target) {
  const result = []
  for (const attacker of target?.attackers || []) {
    for (const skill of attacker?.skillsDetail || []) {
      for (const hit of skill?.hitRecords || []) {
        const timestamp = finiteNumber(hit?.timestamp)
        if (timestamp != null && timestamp > 0) result.push(timestamp)
      }
    }
  }
  return result
}

function deriveTargetTiming(target) {
  const appearedAt = finiteNumber(target?.appearedAt)
  const cleanedAt = finiteNumber(target?.cleanedAt)
  const deathTime = finiteNumber(target?.deathTime)
  const reportedDuration = finiteNumber(target?.duration)
  const hitTimestamps = collectHitTimestamps(target)
  const firstHit = hitTimestamps.length
    ? Math.min(...hitTimestamps)
    : appearedAt
  const lastHit = hitTimestamps.length
    ? Math.max(...hitTimestamps)
    : null

  const activeDuration = firstHit != null && lastHit != null && lastHit >= firstHit
    ? (lastHit - firstHit) / 100
    : (reportedDuration != null && reportedDuration > 0 ? reportedDuration : 0)

  const lifecycleEnd = deathTime != null && appearedAt != null && deathTime >= appearedAt
    ? deathTime
    : cleanedAt
  const elapsedDuration = appearedAt != null && lifecycleEnd != null && lifecycleEnd >= appearedAt
    ? (lifecycleEnd - appearedAt) / 100
    : 0

  // A long cleanup delay is normal occasionally, but a several-fold gap is
  // also the signature of a client processing a backlog with local timestamps.
  const timingAnomaly = elapsedDuration >= 30 &&
    activeDuration >= 0.01 &&
    elapsedDuration - activeDuration >= 30 &&
    elapsedDuration >= activeDuration * 3

  const duration = timingAnomaly
    ? elapsedDuration
    : (reportedDuration != null && reportedDuration > 0 ? reportedDuration : activeDuration)

  return {
    duration: Math.max(duration, 0),
    reportedDuration: Math.max(reportedDuration || 0, 0),
    activeDuration: Math.max(activeDuration, 0),
    elapsedDuration: Math.max(elapsedDuration, 0),
    firstHit,
    lastHit,
    timingAnomaly,
    durationSource: timingAnomaly ? 'elapsed' : (reportedDuration ? 'client' : 'hits')
  }
}

module.exports = {
  collectHitTimestamps,
  deriveTargetTiming
}
