-- Запусти цей файл у MySQL Workbench або phpMyAdmin
-- або через термінал: mysql -u root -p TechUA < schema.sql

CREATE DATABASE IF NOT EXISTS TechUA CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TechUA;

-- ===== АДМІНІСТРАТОРИ =====
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Дефолтний адмін: логін = admin, пароль = admin123
-- (хеш bcrypt для 'admin123')
INSERT IGNORE INTO admins (username, password) VALUES 
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- ===== СТАТТІ =====
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  excerpt TEXT,
  content LONGTEXT,
  author VARCHAR(100) DEFAULT 'Редакція TechUA',
  read_time INT DEFAULT 5,
  emoji VARCHAR(10) DEFAULT '📱',
  gradient VARCHAR(100) DEFAULT 'linear-gradient(135deg,#1a1a2e,#16213e)',
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===== КАТАЛОГ ТЕХНІКИ =====
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  price VARCHAR(100),
  rating DECIMAL(3,1) DEFAULT 8.0,
  emoji VARCHAR(10) DEFAULT '📱',
  gradient VARCHAR(100) DEFAULT 'linear-gradient(135deg,#1a1a2e,#16213e)',
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== ЗАЯВКИ З КОНТАКТІВ =====
CREATE TABLE IF NOT EXISTS contact_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== TELEGRAM ПІДПИСНИКИ =====
CREATE TABLE IF NOT EXISTS telegram_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL UNIQUE,
  username VARCHAR(100),
  first_name VARCHAR(100),
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== ТЕСТОВІ ДАНІ — СТАТТІ =====
INSERT IGNORE INTO articles (title, category, excerpt, content, author, read_time, emoji, gradient) VALUES
('iPhone 16 Pro — найчесніший огляд 2025 року', 'Смартфони', 'Apple знову випустила «революційний» смартфон. Але чи є в ньому щось справді нове?', '<p>Apple знову випустила «революційний» смартфон. Ми протестували iPhone 16 Pro протягом двох тижнів.</p><h3>Що нового?</h3><p>Чіп A18 Pro, нова кнопка керування, покращена камера 48 Мп.</p><h3>Висновок</h3><p>Якщо у вас iPhone 14 або старіший — варто оновлюватись. Якщо 15 Pro — ні.</p>', 'Олексій Коваль', 8, '📱', 'linear-gradient(135deg,#1a1a2e,#16213e)'),
('Топ-5 навушників до 5000 грн', 'Аудіо', 'Зібрали найкращі варіанти за розумні гроші. Від Sony до Xiaomi.', '<p>Ринок навушників величезний. Ми відібрали найкращі варіанти до 5000 грн.</p><h3>1. Sony WH-1000XM4</h3><p>Найкраще шумопоглинання у своєму класі за розумну ціну.</p>', 'Марина Савченко', 5, '🎧', 'linear-gradient(135deg,#1b4332,#2d6a4f)'),
('MacBook Air M4 vs Dell XPS 15', 'Ноутбуки', 'Порівнюємо двох флагманів для роботи: macOS проти Windows.', '<p>Обидва ноутбуки претендують на звання найкращого для роботи. Хто переможе?</p>', 'Денис Мельник', 10, '💻', 'linear-gradient(135deg,#1b263b,#415a77)');

-- ===== ТЕСТОВІ ДАНІ — КАТАЛОГ =====
INSERT IGNORE INTO products (name, category, description, price, rating, emoji, gradient) VALUES
('iPhone 16 Pro', 'phone', 'Найпотужніший iPhone з камерою 48 Мп та чіпом A18 Pro', 'від 54 990 грн', 9.2, '📱', 'linear-gradient(135deg,#1a1a2e,#16213e)'),
('Samsung Galaxy S25', 'phone', 'Флагман Android з Galaxy AI та дисплеєм 120 Гц', 'від 39 990 грн', 8.8, '📱', 'linear-gradient(135deg,#0f3460,#533483)'),
('MacBook Air M4', 'laptop', 'Ідеальний ноутбук для навчання та роботи — тихий і швидкий', 'від 44 990 грн', 9.5, '💻', 'linear-gradient(135deg,#1b263b,#415a77)'),
('Sony WH-1000XM5', 'audio', 'Найкраще шумопоглинання у своєму класі', 'від 10 990 грн', 9.0, '🎧', 'linear-gradient(135deg,#1b4332,#2d6a4f)'),
('Samsung Galaxy Watch 7', 'watch', 'Найрозумніший Android годинник з ЕКГ та моніторингом сну', 'від 12 990 грн', 8.7, '⌚', 'linear-gradient(135deg,#370617,#6a040f)'),
('Sony A7 IV', 'camera', 'Повнокадровий бездзеркальний фотоапарат для професіоналів', 'від 89 990 грн', 9.1, '📷', 'linear-gradient(135deg,#2c2c54,#474787)');
