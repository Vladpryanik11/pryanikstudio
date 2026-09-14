<?php
// Бриф с сайта: принимает ответы из brif.html и отправляет их письмом.
// Ничего не хранит: ответы сразу уходят на почту и нигде не записываются.

const LEAD_EMAIL = 'ipranichnikov@yandex.ru';
const MAX_FIELD = 3000;
const RATE_LIMIT = 5;          // писем с одного адреса
const RATE_WINDOW = 600;       // за 10 минут

// Поля в порядке брифа: имя поля => [раздел, вопрос, обязательное]
const FIELDS = [
  'name'     => ['О компании и задаче', 'Имя', true],
  'phone'    => ['О компании и задаче', 'Телефон', true],
  'tg'       => ['О компании и задаче', 'Telegram', true],
  'about'    => ['О компании и задаче', 'Чем занимается компания и какой продукт сейчас в приоритете', true],
  'goal'     => ['О компании и задаче', 'Главная задача проекта', true],
  'usp'      => ['О компании и задаче', 'Главное преимущество (УТП) перед конкурентами', true],
  'rivals'   => ['О компании и задаче', 'Основные конкуренты', true],
  'buyer'    => ['О компании и задаче', 'Идеальный покупатель', true],
  'pain'     => ['О компании и задаче', 'Главная боль или желание клиента, которое решает продукт', true],
  'smm'      => ['SMM и контент', 'Главная цель SMM на 3–6 месяцев', true],
  'platform' => ['SMM и контент', 'Площадка в первую очередь', false],
  'tone'     => ['SMM и контент', 'Тон общения (Tone of Voice)', true],
  'content'  => ['SMM и контент', 'Ситуация с фото и видео', true],
  'budget'   => ['Бюджет и решение', 'Месячный бюджет на продвижение', true],
  'decider'  => ['Бюджет и решение', 'Кто принимает финальное решение и где удобнее общаться', true],
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $data): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Allow: POST');
  reply(405, ['ok' => false, 'error' => 'method']);
}

// Только со своего сайта
$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== $host) {
  reply(403, ['ok' => false, 'error' => 'origin']);
}

// Ловушка для ботов: скрытое поле, человек его не видит и не заполняет
if (trim((string) ($_POST['company_site'] ?? '')) !== '') {
  reply(200, ['ok' => true]);
}

// Не больше RATE_LIMIT писем с одного IP за RATE_WINDOW секунд
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/pryanik-brief-' . md5($ip);
$now = time();
$hits = [];
if (is_file($rateFile)) {
  $hits = array_filter(array_map('intval', explode(',', (string) @file_get_contents($rateFile))), function ($t) use ($now) {
    return $t > $now - RATE_WINDOW;
  });
}
if (count($hits) >= RATE_LIMIT) {
  reply(429, ['ok' => false, 'error' => 'rate']);
}

$clean = function ($v): string {
  $v = is_string($v) ? $v : '';
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
  return trim(mb_substr($v, 0, MAX_FIELD, 'UTF-8'));
};

$values = [];
foreach (FIELDS as $key => [$section, $label, $required]) {
  $values[$key] = $clean($_POST[$key] ?? '');
  if ($required && $values[$key] === '') {
    reply(422, ['ok' => false, 'error' => 'missing', 'field' => $key]);
  }
}
if (strlen(preg_replace('/\D/', '', $values['phone'])) < 10) {
  reply(422, ['ok' => false, 'error' => 'phone']);
}

$lines = ['Бриф с сайта Pryanik Studio'];
$section = '';
$n = 0;
foreach (FIELDS as $key => [$sec, $label, $required]) {
  if ($sec !== $section) {
    $section = $sec;
    $lines[] = '';
    $lines[] = (++$n) . '. ' . mb_strtoupper($sec, 'UTF-8');
  }
  $lines[] = $label . ': ' . ($values[$key] !== '' ? $values[$key] : 'не указано');
}
$lines[] = '';
$lines[] = 'Отправлено: ' . date('d.m.Y H:i') . ' (время сервера)';
$body = implode("\r\n", $lines);

$name = preg_replace('/[\r\n]+/', ' ', $values['name']);
$subject = '=?UTF-8?B?' . base64_encode('Бриф: ' . mb_substr($name, 0, 80, 'UTF-8')) . '?=';

$domain = preg_replace('/^www\./', '', preg_replace('/[^a-z0-9.\-]/', '', $host));
$from = 'noreply@' . ($domain !== '' ? $domain : 'localhost');
$headers = implode("\r\n", [
  'From: =?UTF-8?B?' . base64_encode('Сайт Pryanik Studio') . '?= <' . $from . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
]);

$sent = @mail(LEAD_EMAIL, $subject, chunk_split(base64_encode($body)), $headers, '-f' . $from);
if (!$sent) {
  reply(500, ['ok' => false, 'error' => 'mail']);
}

$hits[] = $now;
@file_put_contents($rateFile, implode(',', $hits), LOCK_EX);
reply(200, ['ok' => true]);
