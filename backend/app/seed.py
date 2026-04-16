"""Seed initial data into the database if it is empty."""
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Default password for all seed users: password123
HASHED_PASSWORD = pwd_context.hash("password123")


def seed(db: Session) -> None:
    """Insert seed data if the database is empty."""
    if db.query(models.Role).count() > 0:
        return  # already seeded

    # Roles
    roles = [
        models.Role(name="สิบเวร",         description="สิบเวร ผู้รับผิดชอบหลักในการบริหารเวร"),
        models.Role(name="ผู้ช่วยสิบเวร",  description="ผู้ช่วยสิบเวร สนับสนุนสิบเวรหลัก"),
        models.Role(name="โปรแกรมเมอร์",  description="โปรแกรมเมอร์เวรสนับสนุนด้านเทคนิค"),
        models.Role(name="ช่าง",           description="ช่างผู้รับผิดชอบดูแลอุปกรณ์และสถานที่"),
        models.Role(name="เวรนอกเวลา",    description="บุคลากรปฏิบัติงานนอกเวลาราชการ"),
    ]
    db.add_all(roles)
    db.flush()

    # Shifts
    shifts = [
        models.DutyShift(name="เวรปกติ วันธรรมดา",   start_time="16:00", end_time="08:00"),
        models.DutyShift(name="เวรนอกเวลา วันธรรมดา", start_time="18:00", end_time="20:00"),
        models.DutyShift(name="เวรนอกเวลา วันหยุด",   start_time="08:00", end_time="13:00"),
        models.DutyShift(name="เวรปกติ วันหยุด",       start_time="08:00", end_time="08:00"),
    ]
    db.add_all(shifts)
    db.flush()

    # Users
    admin = models.User(
        employee_code="EMP001",
        full_name="System Admin",
        hashed_password=HASHED_PASSWORD,
        email="admin@company.com",
    )
    john = models.User(
        employee_code="EMP002",
        full_name="John Smith",
        hashed_password=HASHED_PASSWORD,
        email="john.smith@company.com",
    )
    db.add_all([admin, john])
    db.flush()

    # User Roles: admin gets all 4, john gets roles 1 & 2
    for role in roles:
        db.add(models.UserRole(user_id=admin.id, role_id=role.id))
    db.add(models.UserRole(user_id=john.id, role_id=roles[0].id))
    db.add(models.UserRole(user_id=john.id, role_id=roles[1].id))
    db.flush()

    # Checklist Templates
    templates = [
        # Role 1: สิบเวร
        (roles[0].id, 1, "ควบคุม กำกับ ดูแลการปฏิบัติหน้าที่เวรประจำวันโดยรวม", 1),
        (roles[0].id, 2, "ตรวจสอบความเรียบร้อยภายในหน่วย บก.และพื้นที่รับผิดชอบของศูนย์คอมพิวเตอร์ ตามที่ต่างๆ", 1),
        (roles[0].id, 3, "พิจารณา สั่งการ และอำนวยการแก้ไขสถานการณ์หรือเหตุขัดข้องที่เกิดขึ้น", 1),
        (roles[0].id, 4, "รายงานเหตุการณ์ผิดปกติหรือเหตุสำคัญต่อผู้บังคับบัญชาตามลำดับชั้น", 1),
        (roles[0].id, 5, "รับโทรศัพท์และประสานงานกับหน่วยงานที่เกี่ยวข้อง", 1),
        (roles[0].id, 6, "ตรวจสอบและรับรองการบันทึกเวรและการส่งมอบเวร", 1),
        # Role 2: ผู้ช่วยสิบเวร
        (roles[1].id, 1, "ปฏิบัติงานตามคำสั่งของสิบเวร", 1),
        (roles[1].id, 2, "ตรวจสอบความเรียบร้อยภายในหน่วยและพื้นที่รับผิดชอบ", 1),
        (roles[1].id, 3, "ลงพื้นที่ตรวจสอบและดำเนินการแก้ไขปัญหาเบื้องต้น", 1),
        (roles[1].id, 4, "รายงานผลการตรวจและการดำเนินการให้สิบเวรทราบ", 1),
        (roles[1].id, 5, "รับโทรศัพท์และประสานงานกับหน่วยงานที่เกี่ยวข้องตามที่ได้รับมอบหมาย", 1),
        # Role 3: โปรแกรมเมอร์
        (roles[2].id, 1, "ดูแลและเฝ้าระวังการทำงานของระบบสารสนเทศและระบบเครือข่าย", 1),
        (roles[2].id, 2, "ตรวจสอบสถานะระบบ (Monitoring) ให้สามารถใช้งานได้อย่างต่อเนื่อง", 1),
        (roles[2].id, 3, "ดำเนินการตอบสนองและแก้ไขเหตุขัดข้องของระบบ (Incident Response)", 1),
        (roles[2].id, 4, "วิเคราะห์และแก้ไขข้อผิดพลาดของระบบ (Debug/Fix)", 1),
        (roles[2].id, 5, "ประสานงานกับทีม IT หรือผู้ใช้งาน เมื่อเกิดปัญหาขยายวงกว้าง", 1),
        (roles[2].id, 6, "บันทึกสาเหตุของปัญหา วิธีแก้ไข และผลการดำเนินการ (Documentation / Post-mortem)", 1),
        (roles[2].id, 7, "สนับสนุนระบบเครือข่ายกรณีสำคัญหรือกรณี VIP เช่น ER, Ward, ทะเบียน, ส่วนเงินรายรับ", 1),
        (roles[2].id, 8, "ดำเนินการปิดกั้นหมายเลข IP ตามที่ศูนย์ไซเบอร์ ทบ. แจ้ง", 1),
        # Role 4: ช่าง
        (roles[3].id, 1, "ดูแล ตรวจสอบ และบำรุงรักษาคอมพิวเตอร์และอุปกรณ์ให้พร้อมใช้งาน", 1),
        (roles[3].id, 2, "รับแจ้งและแก้ไขปัญหาทางโทรศัพท์เบื้องต้น", 1),
        (roles[3].id, 3, "ลงพื้นที่ปฏิบัติงานแก้ไขปัญหา กรณีไม่สามารถแก้ไขทางโทรศัพท์ได้", 1),
        (roles[3].id, 4, "เตรียมอุปกรณ์ เครื่องมือ และอะไหล่สำหรับการแก้ไขปัญหา", 1),
        (roles[3].id, 5, "รายงานผลการปฏิบัติงานให้สิบเวรทราบ", 1),
        # Role 5: เวรนอกเวลา
        (roles[4].id, 1, "ดูแลระบบสารสนเทศของคลินิกนอกเวลาให้สามารถใช้งานได้อย่างต่อเนื่องจนเสร็จสิ้นภารกิจ", 1),
        (roles[4].id, 2, "สนับสนุนการปฏิบัติงานของเจ้าหน้าที่คลินิกนอกเวลา", 1),
        (roles[4].id, 3, "กรณีปฏิบัติหน้าที่แบบ On-call ให้ดำเนินการปรับปรุงข้อมูลเว็บไซต์คลินิกนอกเวลาเมื่อมีการเปลี่ยนแปลง", 0),
        (roles[4].id, 4, "จัดทำหรือปรับปรุงข้อมูลตารางแพทย์ออกตรวจในระบบ Digital Signage เมื่อมีการเปลี่ยนแปลง", 0),
    ]
    for role_id, order, text, required in templates:
        db.add(models.ChecklistTemplate(
            role_id=role_id,
            item_order=order,
            item_text=text,
            is_required=required,
        ))

    db.commit()
