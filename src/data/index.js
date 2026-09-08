// "channel" = ID de usuario de Slack del captador (U...). chat.postMessage
// abre/reutiliza el DM automáticamente al usarlo como destino -- no hace
// falta un canal compartido. IDs verificados, ya en uso en rk-fotografia /
// rk-firmas-notaria (usuarios-del-workspace-con-sus-ids.tsv).
export const CAPTADORES = [
  { name: 'Alejandro García',   channel: 'U0A8F8S4PV1',  initials: 'AG' },
  { name: 'Almudena Gálvez',    channel: 'DIRECT',        initials: 'AL' },
  { name: 'Amparo Orts',        channel: 'U0A9G0NM3CY',  initials: 'AO' },
  { name: 'Asunción Marco',     channel: 'U0A8F4ATGM9',  initials: 'AS' },
  { name: 'Clara Ordoñez',      channel: 'U0A8KKYSVFY',  initials: 'CO' },
  { name: 'Claudia Stelling',   channel: 'U0A8J7BJ9CM',  initials: 'CS' },
  { name: 'Desiree López',      channel: 'U0A867VKVTR',  initials: 'DL' },
  { name: 'Eva Vallés',         channel: 'U0A8KK02Z6J',  initials: 'EV' },
  { name: 'Fede Carbonell',     channel: 'U0A90DLPULR',  initials: 'FC' },
  { name: 'Fran Estelles',      channel: 'U0A8J7808AH',  initials: 'FE' },
  { name: 'Jose Giménez',       channel: 'U0A865TURHD',  initials: 'JG' },
  { name: 'Lorena Lull',        channel: 'U0A8KK0TG94',  initials: 'LL' },
  { name: 'Maria Jose Ordoñez', channel: 'U0AAFGXHKV2',  initials: 'MJ' },
  { name: 'Mariano Del Prado',  channel: 'U0B2KLBL2US',  initials: 'MP' },
  { name: 'Mavi Castillo',      channel: 'U0A8MLSNHV0',  initials: 'MC' },
  { name: 'Mª Luisa Bellver',   channel: 'U0A8KL3AYPQ',  initials: 'ML' },
  { name: 'Natalia Sanfélix',   channel: 'U0A8J79MECV',  initials: 'NS' },
  { name: 'Nuria',              channel: 'U0B2HH7UXHU',  initials: 'NU' },
  { name: 'Rosa Doménech',      channel: 'U0A8R8ZQSBW',  initials: 'RD' },
  { name: 'Sefa Gallent',       channel: 'U0A8F9QGQTD',  initials: 'SG' },
  { name: 'Virginia Corral',    channel: 'U0A8KL4AC94',  initials: 'VC' },
  { name: 'Yvonne Vidal',       channel: 'U0B2G5FG337',  initials: 'YV' },
];
