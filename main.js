const { app, BrowserWindow, ipcMain, protocol, net, Menu, shell } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { title } = require('process');
const isDev = process.env.NODE_ENV === 'development';
const PRODUCTION_URL = 'app://host/client/browser/index.html';
let mainWindow;

let db;

// تسجيل البروتوكول 'app' كامتياز للسماح بالتحميل من app.asar
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, bypassCSP: true, allowServiceWorkers: true, supportFetchAPI: true } }
]);
const DB_FILE_NAME = 'myposts.db';
//  تحويل دالة إنشاء قاعدة البيانات إلى Promise لضمان التسلسل
function createDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(app.getPath('userData'), DB_FILE_NAME);
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('خطأ في فتح قاعدة البيانات:', err.message);
        return reject(err);
      }
      console.log('قاعدة البيانات متصلة بنجاح!', dbPath);
      // تنفيذ إنشاء الجدول داخل serialize لضمان أن الاستعلام ينتهي قبل أن يبدأ أي شيء آخر
      db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS myposts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            text TEXT NOT NULL,
            tags TEXT
          ) `, (err) => {
          if (err) {
            console.error('خطأ في إنشاء الجدول:', err.message);
            return reject(err);
          }
          console.log('تم إنشاء/التحقق من جدول myposts بنجاح.');
          resolve(); // تم الانتهاء بنجاح
        });
      });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadURL(PRODUCTION_URL);
  }

  // mainWindow.webContents.openDevTools();

  function reloadCurrentPage() {
   if (isDev) {
      // في التطوير، نستخدم reload() العادية التي تحافظ على المسار
      mainWindow.webContents.reload();
    } else {
      mainWindow.webContents.reloadIgnoringCache();
    }
  }

  mainWindow.webContents.on('context-menu', (event, params) => {
    const template = [
      { label: 'رجوع', role: 'goBack', enabled: params.canGoBack },
      {
        label: 'إعادة تحميل', click: () => {
          reloadCurrentPage();
        }
      },
      { type: 'separator' },
      {
        label: 'عرض مسار قاعدة البيانات',
        click: () => {
          // 1. بناء المسار الكامل لقاعدة البيانات
          const dbPath = path.join(app.getPath('userData'), DB_FILE_NAME);

          mainWindow.webContents.executeJavaScript(`
           console.log('مسار قاعدة البيانات: ${dbPath.replace(/\\/g, '\\\\')}')
          `);
        }
      },
      {
        label: '📂 فتح مجلد قاعدة البيانات',
        click: () => {
          // بدلاً من استخدام IPC، سنقوم بالفتح مباشرة هنا لتسهيل الأمر
          const dbPath = path.join(app.getPath('userData'), DB_FILE_NAME);
          const dbDir = path.dirname(dbPath);
          shell.openPath(dbDir).catch(console.error);
        }
      },
      // أوامر الملفات
      { label: 'حفظ باسم...', role: 'save' },
      {
        label: 'طباعة...',
        click: () => {
          mainWindow.webContents.print();
        }
      },
      { type: 'separator' },
      { label: 'قص', role: 'cut', enabled: params.isEditable || params.selectionText.length > 0 },
      { label: 'نسخ', role: 'copy', enabled: params.selectionText.length > 0 },
      { label: 'لصق', role: 'paste', enabled: params.isEditable },
      { label: 'تحديد الكل', role: 'selectAll' },
      { type: 'separator' },
      // أوامر المطورين والبحث
      {
        label: 'بحث',
        click: () => {
          console.log('البحث غير متاح حاليًا.');
        }

      },
      { type: 'separator' },
      {
        label: 'عرض مصدر الصفحة',
        click: () => {
          console.log('عرض مصدر الصفحة غير متاح حاليًا.');
        }
      },
      {
        label: 'فحص العنصر',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
        }
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(mainWindow);
  });
}
app.on('ready', async () => {
  // معالج البروتوكول 'app://' ليتمكن من تحميل الملفات من حزمة ASAR
  if (!isDev) {
    protocol.handle('app', (request) => {
      const urlPath = new URL(request.url).pathname;
      const decodedPath = decodeURIComponent(urlPath.split('#')[0]);
      const fullPath = path.join(app.getAppPath(), decodedPath);
      const fallbackPath = path.join(app.getAppPath(), 'client/browser/index.html');
      let finalPath;
      if (decodedPath === '/' || !decodedPath.includes('.')) {
        finalPath = fallbackPath;
      } else {
        finalPath = fullPath;
      }
      // في كل الأحوال، نستخدم net.fetch لتحميل الملف
      return net.fetch(path.normalize(finalPath));
    });
  }
  try {
    await createDatabase(); //  انتظار تهيئة قاعدة البيانات
    createWindow(); //  ثم تحميل الواجهة الأمامية
  } catch (error) {
    console.error('فشل في بدء تشغيل التطبيق بسبب خطأ في قاعدة البيانات. سيتم إغلاق التطبيق:', error);
    app.quit();
  }
});

// إضافة منشور (INSERT)
ipcMain.on('add-post', (event, { title, text, tags }) => {
  const trimmedTitle = String(title || '').trim();
  const trimmedText = String(text || '').trim();
  const safeTags = tags ? String(tags).trim() : '';

  if (!trimmedText) {
    return event.reply('post-added', { success: false, error: 'العنوان والنص مطلوبان.' });
  }

  // ⭐ إزالة db.serialize()
  db.run('INSERT INTO myposts (title, text, tags) VALUES (?, ?,?)', [trimmedTitle, trimmedText, safeTags], function (err) {
    if (err) {
      console.error('خطأ في إضافة المنشور:', err);
      event.reply('post-added', { success: false, error: err.message });
    } else {
      event.reply('post-added', { success: true, id: this.lastID });
      if (mainWindow) {
        mainWindow.webContents.send('refresh-posts');
      }
    }
  });
});

// تعديل منشور (UPDATE)
ipcMain.on('edit-post', (event, { id, title, text, tags }) => {
  const trimmedTitle = String(title || '').trim();
  const trimmedText = String(text || '').trim();
  const safeTags = tags ? String(tags).trim() : '';

  if (!trimmedText) {
    return event.reply('post-edited', { success: false, error: ' النص مطلوب .' });
  }

  // ⭐ إزالة db.serialize()
  db.run('UPDATE myposts SET title = ? , text = ?, tags = ? WHERE id = ?', [trimmedTitle, trimmedText, safeTags, id], function (err) {
    if (err) {
      console.error('خطأ في تعديل المنشور:', err);
      event.reply('post-edited', { success: false, error: err.message });
    } else {
      event.reply('post-edited', { success: true });
      if (mainWindow) {
        mainWindow.webContents.send('refresh-posts');
      }
    }
  });
});
// بحث عن منشورات (SELECT) - يتضمن الحماية ضد كلمة البحث الفارغة
ipcMain.on('search-posts', (event, keyword) => {
  const safeKeyword = keyword ? String(keyword).trim() : '';
  if (!safeKeyword) {
    // إذا كانت الكلمة فارغة، استرجع كل شيء
    db.all('SELECT * FROM myposts', (err, results) => {
      if (err) {
        console.error('خطأ في الحصول على المنشورات:', err);
        event.reply('search-results', []);
      } else {
        event.reply('search-results', results);
      }
    });
    return;
  }
  const query = 'SELECT * FROM myposts WHERE title like ? or text LIKE ? OR tags LIKE ?';
  const searchTerm = `%${safeKeyword}%`;
  db.all(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error('خطأ في البحث:', err);
      event.reply('search-results', []);
    } else {
      event.reply('search-results', results);
    }
  });
});
// الحصول على جميع المنشورات (SELECT)
ipcMain.on('get-all-posts', (event) => {
  db.all('SELECT * FROM myposts', (err, results) => {
    if (err) {
      console.error('خطأ في الحصول على المنشورات:', err);
      event.reply('all-posts', []);
    } else {
      event.reply('all-posts', results);
    }
  });
});
// ... (بقية الدوال دون تغيير)
ipcMain.on('get-post', (event, id) => {
  db.get('SELECT * FROM myposts WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('خطأ في الحصول على المنشور:', err);
      event.reply('post-data', null);
    } else {
      event.reply('post-data', result);
    }

  });

});

ipcMain.on('delete-post', (event, id) => {
  db.run('DELETE FROM myposts WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('خطأ في حذف المنشور:', err);
      event.reply('post-deleted', { success: false, error: err.message });
    } else {
      event.reply('post-deleted', { success: true });
      if (mainWindow) {
        mainWindow.webContents.send('refresh-posts');
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
