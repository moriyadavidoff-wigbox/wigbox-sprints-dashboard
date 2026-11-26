# WIGBOX דשבורדים

עמודי מעקב פנימיים של WIGBOX. כרגע: דשבורד הספרינט הפעיל ב-Zoho Sprints.

> **שימו לב:** בשלב הזה האתר מתפרסם ב-GitHub Pages ציבורי, בלי כניסה. כל מי שיש לו את הכתובת, וגם כל מי שמגיע למאגר, יכול לראות את הנתונים (שמות, משימות, סטטוסים). בהמשך: פריסה עם כניסה למשתמשות מורשות בלבד (ראו למטה).

הכתובת: https://moriyadavidoff-wigbox.github.io/wigbox-sprints-dashboard/

## מבנה

| נתיב | מה זה |
|---|---|
| `index.html` | עמוד הבית: רשימת הדשבורדים. |
| `sprint/index.html` | דשבורד הספרינט. קורא את `data/sprint.json`. |
| `data/sprint.json` | תמונת מצב של הספרינט הפעיל. מתעדכן אוטומטית. |
| `scripts/update-sprint.mjs` | מושך את הספרינט מ-Zoho Sprints וכותב את `data/sprint.json`. |
| `lib/zoho.js` | קריאה בלבד מ-Zoho Sprints: ספרינט פעיל, פריטים כולל תתי-פריטים, אפיקים. |
| `.github/workflows/update-data.yml` | מריץ את העדכון בימים א׳–ה׳ ב-04:10 UTC, ואפשר גם ידנית. |
| `api/` | לשלב הבא: כניסה עם Google ונתונים חיים בשרת (Vercel). לא בשימוש ב-GitHub Pages. |

אין תלויות חיצוניות. Node 20.

## הפעלה (פעם אחת)

### 1. GitHub Pages
Settings ← Pages ← Source: **Deploy from a branch** ← Branch: `main`, תיקייה `/ (root)` ← Save.

### 2. עדכון יומי מ-Zoho Sprints
1. ב-[Zoho API Console](https://api-console.zoho.com/) יוצרים **Self Client**.
2. ב-**Generate Code** מזינים scopes:
   `ZohoSprints.teams.READ,ZohoSprints.projects.READ,ZohoSprints.sprints.READ,ZohoSprints.items.READ,ZohoSprints.epic.READ`
   (לברר: אם מתקבלת שגיאת scope, לבדוק את השמות המדויקים בתיעוד של Zoho Sprints API).
3. מחליפים את הקוד ב-refresh token (בתוך 10 דקות):
   `POST https://accounts.zoho.com/oauth/v2/token?grant_type=authorization_code&client_id=...&client_secret=...&code=...`
4. במאגר: Settings ← Secrets and variables ← Actions ← **New repository secret**, שלושה סודות:
   `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`.
5. Actions ← **Update data** ← **Run workflow** כדי לבדוק. אם הריצה ירוקה, `data/sprint.json` התעדכן.

הסודות לא נחשפים גם כשהמאגר ציבורי. ה-refresh token נותן קריאה בלבד, עם ההרשאות של מי שיצרה אותו.

אם החשבון ב-Zoho לא ב-US: מוסיפים Variables (לא Secrets) `ZOHO_ACCOUNTS_URL` (למשל `https://accounts.zoho.eu`) ו-`ZOHO_SPRINTS_API` (למשל `https://sprintsapi.zoho.eu/zsapi`).

## הוספת דשבורד חדש
1. תיקייה חדשה עם `index.html`, למשל `crm/index.html`.
2. סקריפט עדכון ב-`scripts/` שכותב ל-`data/`, וצעד נוסף ב-workflow.
3. כרטיס חדש ב-`index.html` הראשי.

## השלב הבא: כניסה למשתמשות מורשות
הקוד ב-`api/` מוכן לפריסה ב-Vercel עם כניסת Google שמוגבלת ל-wigbox.co.il:
- `api/login.js`, `api/callback.js`, `api/logout.js`: כניסה, ורק חשבון מאומת של הדומיין מקבל עוגייה חתומה.
- `api/data.js`: מחזיר את נתוני הספרינט חיים מ-Zoho, רק למי שמחוברת.
- ב-`sprint/index.html` משנים את `DATA_URL` ל-`/api/data`, ומוציאים את `data/` מהמאגר.
- משתני סביבה ב-Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` (32 תווים לפחות), `ALLOWED_DOMAIN=wigbox.co.il`, ושלושת סודות ה-Zoho.
- ב-Google Cloud: מסך הסכמה מסוג **Internal**, ו-redirect URI: `https://<הכתובת>/api/callback`.
- במעבר הזה המאגר צריך להיות פרטי.
