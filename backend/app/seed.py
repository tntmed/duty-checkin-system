"""Seed initial data into the database if it is empty."""
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash(password: str) -> str:
    return pwd_context.hash(password)


ADMINS = {"tntmed", "kasom"}

USERS = [
    # (employee_code, full_name, email, tel, sub_department)
    ("kasom",   "นพ. กศม ภังคานนท์",           "kasombgn@pcm.ac.th",        "0818456844", None),
    ("tntmed",  "นพ.ธนกร เทียนศรี",            "tntmed@pcm.ac.th",          "0991988988", None),
    ("com26",   "จ.ส.อ.ชัยณรงค์ แพทย์วงษ์",    "chainarong.pw@pcm.ac.th",   "0863499290", "ช่าง"),
    ("com43",   "จ.ส.อ.จักรพงษ์ ฉัตรชานนท์",   "jakkapong.chart@pcm.ac.th", "0648600482", "ช่าง"),
    ("com05",   "จ.ส.อ.พิษณุ ศรีสล้าย",         "pitsanu.ssl@pcm.ac.th",     "0635859361", "ช่าง"),
    ("com52",   "จ.ส.อ.ณรงค์ศักดิ์ ยาสี",       "narongsak.yasi@pcm.ac.th",  "0866903828", "Programmer"),
    ("com57",   "ส.อ.อารยา บุรารักษ์",           "araya.bu@pcm.ac.th",        "0972282528", "ธุรการ"),
    ("com56",   "ส.อ.ทศพล บวชชัยภูมิ",           "thotsaphon.bcp@pcm.ac.th",  "0845212282", "ช่าง"),
    ("com07",   "น.ส.พิมพ์ชฎา จินดาไพโรจน์",    "pk_bum@pcm.ac.th",          "0659894618", "ธุรการ"),
    ("com28",   "น.ส.สุวรรณี หงส์ฟ้องฟ้า",      "suwannee.hong@pcm.ac.th",   "0918125571", "Programmer"),
    ("com30",   "น.ส.นัยนา สัมฤทธิ์",            "naiyana.sr@pcm.ac.th",      "0863880084", "Internet"),
    ("com29",   "น.ส.ชูดิมา รัตนจิตเกษม",        "chutima.rat@pcm.ac.th",     "0646591991", "Internet"),
    ("com42",   "น.ส.สุจิตรา ฉายเสมแสง",         "sujitra.chai@pcm.ac.th",    "0957988809", "Internet"),
    ("com50",   "น.ส.สุวิดา สุขเรือนสุวรรณ",     "suvida.suk@pcm.ac.th",      "0846514965", "Internet"),
    ("com49",   "นายสัมพันธ์ พันธุ์เจริญ",        "phancharean@pcm.ac.th",     "0868075175", "ช่าง"),
    ("com54",   "น.ส.วรายา คำเจริญ",              "waraya.kham@pcm.ac.th",     "0890520614", "ธุรการ"),
    ("com35",   "น.ส.จิราพรรณ ครีบภูบุตร",        "jiraphan.krib@pcm.ac.th",   "0882182151", "Internet"),
    ("com103",  "นายมงคล คำป่วน",                 "k.mongkon@pcm.ac.th",       "0979435106", "ช่าง"),
    ("com109",  "นายธนะวัตน์ ไกรทอง",             "thanarat.kth@pcm.ac.th",    "0919909049", "Programmer"),
    ("com108",  "นายอัมรินทร์ จันทร์คทา",          "ammarin.jan@pcm.ac.th",     "0969023109", "Programmer"),
    ("com111",  "นายสิวะณัฐ ชื่นอารมย์",           "sivanut.chue@pcm.ac.th",    "0852377366", "Programmer"),
    ("com112",  "น.ส.อรอุษา ต้นโห",               "on-usa@pcm.ac.th",          "0959515552", "Programmer"),
    ("com117",  "นายเกษม คุณาภิสิทธิ์",            "kasem@pcm.ac.th",           "0986875256", "ช่าง"),
    ("com119",  "นายพัชรพล ชัยภักดี",              "patcharapol@pcm.ac.th",     "0982541137", "Internet"),
    ("com120",  "น.ส.ญาณิศา เชื้อมอญ",            "yanisa_c@pcm.ac.th",        "0888105173", "Programmer"),
    ("com122",  "นายภัทรพล ศรีบุญขำ",              "pattarapon@pcm.ac.th",      "0984520631", "Programmer"),
    ("com123",  "น.ส.สุวัตน์ติกานต์ คำสือ",        "sulattikran.kum@pcm.ac.th", "0622376235", "ช่าง"),
]

# sub_department → role name mapping
DEPT_ROLE_MAP = {
    "ช่าง":       "ช่าง",
    "Programmer": "โปรแกรมเมอร์",
}


def seed(db: Session) -> None:
    """Insert seed data if the database is empty."""
    # ── Roles ──────────────────────────────────────────────────────────────
    if db.query(models.Role).count() == 0:
        roles_data = [
            models.Role(name="สิบเวร",         description="สิบเวร ผู้รับผิดชอบหลักในการบริหารเวร"),
            models.Role(name="ผู้ช่วยสิบเวร",  description="ผู้ช่วยสิบเวร สนับสนุนสิบเวรหลัก"),
            models.Role(name="โปรแกรมเมอร์",  description="โปรแกรมเมอร์เวรสนับสนุนด้านเทคนิค"),
            models.Role(name="ช่าง",           description="ช่างผู้รับผิดชอบดูแลอุปกรณ์และสถานที่"),
            models.Role(name="เวรนอกเวลา",    description="บุคลากรปฏิบัติงานนอกเวลาราชการ"),
        ]
        db.add_all(roles_data)
        db.flush()

    # ── Shifts ─────────────────────────────────────────────────────────────
    # (name, start_time, end_time, is_active)
    SHIFTS = [
        ("เวรนอกเวลา วันราชการ",  "16:00", "20:00", 1),
        ("เวรนอกเวลา วันหยุด",    "08:00", "12:00", 1),
        ("วันราชการ",             "16:00", "00:00", 1),
        ("เวรวันราชการ",          "16:00", "08:00", 1),
        ("วันหยุด",               "08:00", "08:00", 1),
        ("วันราชการ กลางคืน",     "00:00", "08:00", 1),
        ("วันหยุด รอบเช้า",        "08:00", "20:00", 0),
        ("วันหยุด รอบค่ำ",         "20:00", "08:00", 0),
    ]
    if db.query(models.DutyShift).count() == 0:
        db.add_all([models.DutyShift(name=n, start_time=s, end_time=e, is_active=a) for n, s, e, a in SHIFTS])
        db.flush()
    else:
        existing = db.query(models.DutyShift).order_by(models.DutyShift.id).all()
        for i, shift in enumerate(existing):
            if i < len(SHIFTS):
                n, s, e, a = SHIFTS[i]
                shift.name, shift.start_time, shift.end_time, shift.is_active = n, s, e, a
            else:
                shift.is_active = 0  # ปิด shift เกิน
        for i in range(len(existing), len(SHIFTS)):
            n, s, e, a = SHIFTS[i]
            db.add(models.DutyShift(name=n, start_time=s, end_time=e, is_active=a))
        db.flush()

    # ── Checklist Templates ────────────────────────────────────────────────
    if db.query(models.ChecklistTemplate).count() == 0:
        roles = {r.name: r for r in db.query(models.Role).all()}
        templates = [
            (roles["สิบเวร"].id,        1, "ควบคุม กำกับ ดูแลการปฏิบัติหน้าที่เวรประจำวันโดยรวม", 1),
            (roles["สิบเวร"].id,        2, "ตรวจสอบความเรียบร้อยภายในหน่วย บก.และพื้นที่รับผิดชอบของศูนย์คอมพิวเตอร์ ตามที่ต่างๆ", 1),
            (roles["สิบเวร"].id,        3, "พิจารณา สั่งการ และอำนวยการแก้ไขสถานการณ์หรือเหตุขัดข้องที่เกิดขึ้น", 1),
            (roles["สิบเวร"].id,        4, "รายงานเหตุการณ์ผิดปกติหรือเหตุสำคัญต่อผู้บังคับบัญชาตามลำดับชั้น", 1),
            (roles["สิบเวร"].id,        5, "รับโทรศัพท์และประสานงานกับหน่วยงานที่เกี่ยวข้อง", 1),
            (roles["สิบเวร"].id,        6, "ตรวจสอบและรับรองการบันทึกเวรและการส่งมอบเวร", 1),
            (roles["ผู้ช่วยสิบเวร"].id, 1, "ปฏิบัติงานตามคำสั่งของสิบเวร", 1),
            (roles["ผู้ช่วยสิบเวร"].id, 2, "ตรวจสอบความเรียบร้อยภายในหน่วยและพื้นที่รับผิดชอบ", 1),
            (roles["ผู้ช่วยสิบเวร"].id, 3, "ลงพื้นที่ตรวจสอบและดำเนินการแก้ไขปัญหาเบื้องต้น", 1),
            (roles["ผู้ช่วยสิบเวร"].id, 4, "รายงานผลการตรวจและการดำเนินการให้สิบเวรทราบ", 1),
            (roles["ผู้ช่วยสิบเวร"].id, 5, "รับโทรศัพท์และประสานงานกับหน่วยงานที่เกี่ยวข้องตามที่ได้รับมอบหมาย", 1),
            (roles["โปรแกรมเมอร์"].id,  1, "ดูแลและเฝ้าระวังการทำงานของระบบสารสนเทศและระบบเครือข่าย", 1),
            (roles["โปรแกรมเมอร์"].id,  2, "ตรวจสอบสถานะระบบ (Monitoring) ให้สามารถใช้งานได้อย่างต่อเนื่อง", 1),
            (roles["โปรแกรมเมอร์"].id,  3, "ดำเนินการตอบสนองและแก้ไขเหตุขัดข้องของระบบ (Incident Response)", 1),
            (roles["โปรแกรมเมอร์"].id,  4, "วิเคราะห์และแก้ไขข้อผิดพลาดของระบบ (Debug/Fix)", 1),
            (roles["โปรแกรมเมอร์"].id,  5, "ประสานงานกับทีม IT หรือผู้ใช้งาน เมื่อเกิดปัญหาขยายวงกว้าง", 1),
            (roles["โปรแกรมเมอร์"].id,  6, "บันทึกสาเหตุของปัญหา วิธีแก้ไข และผลการดำเนินการ (Documentation / Post-mortem)", 1),
            (roles["โปรแกรมเมอร์"].id,  7, "สนับสนุนระบบเครือข่ายกรณีสำคัญหรือกรณี VIP เช่น ER, Ward, ทะเบียน, ส่วนเงินรายรับ", 1),
            (roles["โปรแกรมเมอร์"].id,  8, "ดำเนินการปิดกั้นหมายเลข IP ตามที่ศูนย์ไซเบอร์ ทบ. แจ้ง", 1),
            (roles["ช่าง"].id,          1, "ดูแล ตรวจสอบ และบำรุงรักษาคอมพิวเตอร์และอุปกรณ์ให้พร้อมใช้งาน", 1),
            (roles["ช่าง"].id,          2, "รับแจ้งและแก้ไขปัญหาทางโทรศัพท์เบื้องต้น", 1),
            (roles["ช่าง"].id,          3, "ลงพื้นที่ปฏิบัติงานแก้ไขปัญหา กรณีไม่สามารถแก้ไขทางโทรศัพท์ได้", 1),
            (roles["ช่าง"].id,          4, "เตรียมอุปกรณ์ เครื่องมือ และอะไหล่สำหรับการแก้ไขปัญหา", 1),
            (roles["ช่าง"].id,          5, "รายงานผลการปฏิบัติงานให้สิบเวรทราบ", 1),
            (roles["เวรนอกเวลา"].id,    1, "ดูแลระบบสารสนเทศของคลินิกนอกเวลาให้สามารถใช้งานได้อย่างต่อเนื่องจนเสร็จสิ้นภารกิจ", 1),
            (roles["เวรนอกเวลา"].id,    2, "สนับสนุนการปฏิบัติงานของเจ้าหน้าที่คลินิกนอกเวลา", 1),
            (roles["เวรนอกเวลา"].id,    3, "กรณีปฏิบัติหน้าที่แบบ On-call ให้ดำเนินการปรับปรุงข้อมูลเว็บไซต์คลินิกนอกเวลาเมื่อมีการเปลี่ยนแปลง", 0),
            (roles["เวรนอกเวลา"].id,    4, "จัดทำหรือปรับปรุงข้อมูลตารางแพทย์ออกตรวจในระบบ Digital Signage เมื่อมีการเปลี่ยนแปลง", 0),
        ]
        for role_id, order, text, required in templates:
            db.add(models.ChecklistTemplate(
                role_id=role_id,
                item_order=order,
                item_text=text,
                is_required=required,
            ))
        db.flush()

    # ── Users ──────────────────────────────────────────────────────────────
    roles = {r.name: r for r in db.query(models.Role).all()}
    existing_codes = {u.employee_code for u in db.query(models.User.employee_code).all()}

    for emp_code, full_name, email, tel, dept in USERS:
        if emp_code in existing_codes:
            continue

        user = models.User(
            employee_code=emp_code,
            full_name=full_name,
            email=email,
            hashed_password=_hash(tel),
            is_admin=1 if emp_code in ADMINS else 0,
        )
        db.add(user)
        db.flush()

        role_name = DEPT_ROLE_MAP.get(dept)
        if role_name and role_name in roles:
            db.add(models.UserRole(user_id=user.id, role_id=roles[role_name].id))

    db.commit()
