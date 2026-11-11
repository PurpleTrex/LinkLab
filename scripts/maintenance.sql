-- Apply only under an operator-approved retention policy; schedule externally.
-- Aggregate metrics: retain 90 calendar days. Audit events: retain 365 days.
DELETE FROM daily_metrics WHERE day < date('now', '-90 days');
DELETE FROM audit WHERE occurredAt < (unixepoch('now', '-365 days') * 1000);
DELETE FROM rate_limits WHERE window < (unixepoch('now', '-1 day') / 60);
-- Reap abandoned lab fixtures after an hour; normal aliases remain permanently reserved.
DELETE FROM daily_metrics WHERE linkId IN (SELECT id FROM links WHERE ownerId LIKE 'lab/%' AND createdAt < unixepoch('now', '-1 hour') * 1000);
DELETE FROM audit WHERE ownerId IN (SELECT ownerId FROM links WHERE ownerId LIKE 'lab/%' AND createdAt < unixepoch('now', '-1 hour') * 1000);
DELETE FROM links WHERE ownerId LIKE 'lab/%' AND createdAt < unixepoch('now', '-1 hour') * 1000;
