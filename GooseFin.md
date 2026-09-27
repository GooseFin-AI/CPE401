# Multi-Agent: An Auditable Financial Data and Investment Intelligence Platform

> **CPE 401 - Computer Engineering Project**
>
> รายงานโครงงานพัฒนาแพลตฟอร์มวิเคราะห์ข้อมูลทางการเงินและการลงทุนด้วยสถาปัตยกรรม Multi-Agent ที่ออกแบบให้ตรวจสอบย้อนกลับได้ อธิบายเหตุผลได้ และรองรับการใช้งานเป็นระบบช่วยตัดสินใจ

## ภาพรวมและที่มา

ในช่วงไม่กี่ปีที่ผ่านมา อุตสาหกรรมการลงทุนได้นำปัญญาประดิษฐ์ (Artificial Intelligence: AI) และ Large Language Models (LLMs) มาใช้สนับสนุนการวิเคราะห์การลงทุนมากขึ้น เครื่องมือแบบ Open Source เช่น OpenBB และ Alpha Terminal ช่วยลดเวลาในการค้นหาและประมวลผลข้อมูลทางการเงินจำนวนมากได้อย่างมีประสิทธิภาพ แต่อย่างไรก็ตาม เครื่องมือเหล่านี้ยังมีข้อจำกัดสำคัญด้านความน่าเชื่อถือของผลลัพธ์ โดยมักขาดกลไกสำหรับติดตามแหล่งที่มาของตัวเลขที่ถูกนำไปใช้ประกอบการตัดสินใจ และค่า confidence ที่สร้างโดย LLM อาจไม่ได้รับการตรวจสอบไขว้กับค่าที่คำนวณจริง ปัญหาดังกล่าวเพิ่มความเสี่ยงจาก hallucination ทำให้ผู้ตรวจสอบไม่สามารถอธิบายที่มาของผลลัพธ์หรือกระบวนการตัดสินใจได้อย่างชัดเจน

โครงงานนี้จึงมุ่งพัฒนาแพลตฟอร์มวิเคราะห์ข้อมูลทางการเงินและการลงทุนแบบ Multi-Agent โดยแยกหน้าที่ของ LLM ออกจากเครื่องมือคำนวณที่กำหนดผลลัพธ์อย่างแน่นอน (Deterministic Financial Calculation Engine) เพื่อให้ตัวเลขที่มีผลต่อการตัดสินใจสามารถตรวจสอบและทำซ้ำได้และข้อมูลทุกชุดต้องระบุแหล่งที่มาและช่วงเวลาที่ข้อมูลนั้นเป็นสิ่งที่ผู้ลงทุนสามารถรับรู้ได้จริง (point-in-time / actually knowable) ตัวเลขทุกตัวต้องเชื่อมโยงกลับไปยังเอกสารต้นทางได้ และข้อสรุปทุกข้อควรมี audit log รองรับ

## แนวคิดหลักของระบบ

ระบบถูกออกแบบให้ใช้ Agent หลายตัวที่มีหน้าที่เฉพาะด้าน แทนการพึ่งพาโมเดลเดียวแบบกล่องดำ โดยแบ่งความรับผิดชอบหลักออกเป็นสองส่วน

- **LLM และ Multi-Agent Layer** รับผิดชอบการดึงข้อมูล การวางแผน การเรียบเรียงคำอธิบาย และการประสานงานระหว่าง Agent
- **Deterministic Financial Calculation Engine** รับผิดชอบการคำนวณตัวเลขที่มีนัยสำคัญต่อการตัดสินใจ เพื่อให้ผลลัพธ์มีความสม่ำเสมอ ตรวจสอบได้ และไม่ขึ้นกับคำตอบที่คาดเดาโดย LLM เพียงอย่างเดียว

แนวคิดนี้ทำให้ผู้ใช้สามารถตรวจสอบเส้นทางตั้งแต่ข้อมูลต้นทาง สูตรคำนวณ สมมติฐาน ผลลัพธ์ระหว่างทาง ไปจนถึงข้อสรุปสุดท้ายได้อย่างเป็นระบบ

## ปัญหาที่โครงงานต้องการแก้ไข

### 1. Knowledge Integrity Failure - ความล้มเหลวด้านความถูกต้องของข้อมูล

ข้อมูลที่เข้าสู่ระบบอาจผิด ไม่ครบ ล้าสมัย หรือไม่มีแหล่งที่มาที่ตรวจสอบได้ เช่น จำนวนหุ้นที่ใช้เป็นข้อมูลเก่า การใช้เอกสารคนละฉบับ หรือการดึงข้อมูลไม่ครอบคลุม ประเด็นนี้ครอบคลุม data staleness, data completeness, provenance gap, version mismatch และ retrieval coverage gap

### 2. Reasoning Integrity Failure - ความล้มเหลวด้านกระบวนการให้เหตุผล

แม้ข้อมูลนำเข้าจะถูกต้องและครบถ้วน ระบบ AI ก็ยังอาจตีความผิด คำนวณผิด หรือสรุปความสัมพันธ์ผิดจาก hallucination และ faulty inference ดังนั้น LLM ไม่ควรถูกใช้เป็นผู้ตัดสินตัวเลขขั้นสุดท้ายโดยไม่มี deterministic calculation หรือกลไกตรวจสอบสนับสนุน

### 3. Decision Traceability Gap - ช่องว่างในการตรวจสอบย้อนกลับของการตัดสินใจ

ระบบอาจให้ข้อสรุปที่ถูกต้อง แต่ไม่สามารถแสดงได้ว่าข้อสรุปนั้นเกิดจากหลักฐาน การคำนวณ และเหตุผลใดบ้าง รวมถึงความเสี่ยงจาก post-hoc explanation ซึ่งเป็นคำอธิบายที่สร้างขึ้นภายหลังและอาจไม่ใช่หลักฐานของกระบวนการตัดสินใจจริง

### 4. Authority Boundary Violation - การทำงานเกินขอบเขตอำนาจ

Agent อาจทำงานเกินหน้าที่ที่กำหนดไว้ เช่น อนุมัติการดำเนินการหรือส่งคำสั่งซื้อขายโดยไม่มีการอนุมัติจากมนุษย์ ระบบจึงต้องกำหนด authority boundary, permission scope, execution policy และ human-in-the-loop control ให้ชัดเจน

### 5. AI Governance and Control Gap - ช่องว่างด้านธรรมาภิบาลและการควบคุม AI

เมื่อองค์กรมีโมเดล Agent และ workflow จำนวนมาก ความเสี่ยงไม่ได้อยู่แค่โมเดลใดโมเดลหนึ่ง แต่อยู่ที่การกำกับดูแลทั้งระบบ เช่น ไม่ทราบว่าใช้ข้อมูลใด ใครเป็นเจ้าของ ไม่มี monitoring ที่ครอบคลุม หรือไม่มี kill-switch และ policy enforcement ที่ทำงานได้จริง

## วัตถุประสงค์ของโครงการ

1. ช่วยให้นักวิเคราะห์และผู้เชี่ยวชาญด้านการลงทุนเปลี่ยนข้อมูลทางการเงินจากหลายแหล่ง ซึ่งมีรูปแบบและนิยามแตกต่างกัน ให้กลายเป็นข้อมูลวิเคราะห์ที่น่าเชื่อถือ อธิบายได้ และพร้อมใช้ประกอบการตัดสินใจ
2. ช่วยให้ผู้ใช้สร้างความเข้าใจเชิงพื้นฐานของบริษัทจากหลักฐานทางการเงินจริง ครอบคลุมฐานะการเงิน ผลการดำเนินงาน โครงสร้างรายได้และต้นทุน กระแสเงินสด ปัจจัยขับเคลื่อนธุรกิจ สมมติฐานในอนาคต มูลค่ายุติธรรม ความเสี่ยง และผลกระทบต่อ Investment Thesis
3. ทำให้กระบวนการตั้งแต่ข้อมูลต้นทางจนถึงข้อสรุปด้านการลงทุนมีความน่าเชื่อถือ และสามารถอธิบายเหตุผลที่เชื่อมโยงแต่ละขั้นตอนได้อย่างชัดเจน
4. ช่วยให้ผู้ใช้ตอบคำถามสำคัญของ Fundamental Investment Research ได้โดยมีหลักฐานรองรับอย่างครบถ้วน

## ขอบเขตการดำเนินงาน

- ระบบมุ่งเน้น workflow ของ Fundamental Investment Research สำหรับ Equity Research Analysts, Investment Analysts และ Fund/Asset Management Analysts โดยมี Portfolio Managers หรือ Senior Analysts เป็นผู้ใช้งานปลายทางที่นำผลวิเคราะห์ไปทบทวนและประกอบการตัดสินใจ
- ผู้ใช้สามารถค้นหาและตรวจสอบข้อมูลบริษัท วิเคราะห์งบการเงิน กำหนดสมมติฐาน สร้างประมาณการ ทำ valuation และจัดทำ Investment Research Report
- ผลลัพธ์ทุกส่วนควรสามารถตรวจสอบแหล่งข้อมูล สูตรคำนวณ และ audit trail ที่อยู่เบื้องหลังได้
- ระบบเป็น **Decision-Support System** เท่านั้น Agent ไม่มีอำนาจระงับบัญชี อนุมัติธุรกรรม หรือส่งคำสั่งซื้อขายแทนผู้ใช้
- ขอบเขตกรณีศึกษาของ MVP คือบริษัทและข้อมูลที่อยู่ในดัชนี S&P 500 โดยเน้นข้อมูลสาธารณะ เช่น filings และเอกสารทางการเงินที่ตรวจสอบได้

## กลุ่มผู้ใช้และกรณีศึกษา

### กลุ่มผู้ใช้เป้าหมาย

- Equity Research Analyst
- Investment Analyst
- Fund and Asset Management Analyst
- Portfolio Manager หรือ Senior Analyst ในฐานะผู้ทบทวนและนำผลวิเคราะห์ไปใช้

### กรณีศึกษา

โครงงานเลือกดัชนี **S&P 500** เป็นขอบเขตกรณีศึกษา เนื่องจากมีข้อมูลสาธารณะและ filings จำนวนมาก เหมาะสำหรับการสาธิตกระบวนการตั้งแต่การค้นหาข้อมูล การวิเคราะห์ ไปจนถึงการสร้างรายงานการลงทุนแบบตรวจสอบย้อนกลับได้

## ผลลัพธ์ที่คาดหวัง

1. ต้นแบบระบบ Fundamental Investment Research ในรูปแบบ Web Application
2. ระบบที่ติดตั้งและใช้งานผ่าน CLI ได้ รองรับการเก็บข้อมูล การวิเคราะห์ การประเมินมูลค่า และการสร้าง Investment Research Report โดยใช้ LLM-based Multi-Agent Architecture ทำงานร่วมกับ Deterministic Financial Calculation Engine
3. ระบบ audit trail แบบ end-to-end พร้อมผลการประเมินด้าน numerical accuracy, claim traceability, reproducibility และ auditability
4. สถาปัตยกรรมที่สามารถขยายต่อผ่าน API หรือมาตรฐานการเชื่อมต่อ เช่น Model Context Protocol (MCP) เพื่อรองรับการเชื่อมต่อกับแพลตฟอร์ม AI ภายนอกในอนาคต

## องค์ประกอบหลักของระบบ

| องค์ประกอบ | หน้าที่หลัก |
| --- | --- |
| LLM-based Multi-Agent Layer | ดึงข้อมูล วางแผน ประสานงาน และอธิบายผลลัพธ์ |
| Deterministic Financial Calculation Engine | คำนวณตัวเลขสำคัญและตรวจสอบความถูกต้องของผลลัพธ์ |
| Financial Data and Source Layer | จัดเก็บข้อมูล แหล่งที่มา เอกสารต้นทาง และจุดเวลาที่ข้อมูลเป็น actually knowable |
| Audit Trail and Evidence Layer | บันทึกหลักฐาน สูตรคำนวณ สมมติฐาน ลำดับการทำงาน และที่มาของข้อสรุป |
| Web Application and CLI | ให้ผู้ใช้ค้นหา วิเคราะห์ ตรวจสอบ และสร้างรายงานการลงทุน |

## โครงสร้าง Repository

- **backend/** - Backend services, APIs, data workflows และ logic ของ Agent
- **frontend/** - ส่วนติดต่อผู้ใช้และการนำเสนอข้อมูลการวิเคราะห์
- **README.md** - เอกสารอธิบายโครงงานและบริบททางวิชาการ

## Branch Strategy

| Branch | วัตถุประสงค์ |
| --- | --- |
| **main** | Branch หลักสำหรับรวมโค้ดที่ผ่านการทบทวนและพร้อมใช้งานร่วมกัน |
| **backend** | พัฒนา API, data pipeline, financial calculation engine และ Agent services |
| **frontend** | พัฒนา User Interface, user flow และการนำเสนอผลวิเคราะห์ |

การพัฒนาควรทำบน Branch ที่รับผิดชอบ แล้วส่ง Pull Request เพื่อรวมกลับเข้า **main** หลังจากผ่านการ review และตรวจสอบพื้นฐานเรียบร้อยแล้ว

## สถานะโครงการ

- [x] สร้าง Private GitHub Repository
- [x] เพิ่ม README สำหรับรายงานโครงงาน
- [x] สร้าง Branch main, backend และ frontend
- [ ] กำหนด system requirements และ data contracts อย่างละเอียด
- [ ] พัฒนา backend foundation และ Agent orchestration
- [ ] พัฒนา frontend foundation และ Agent Chat
- [ ] เชื่อมต่อแหล่งข้อมูลทางการเงินและระบบ audit trail
- [ ] ทดสอบ numerical accuracy, traceability, reproducibility และ auditability
- [ ] จัดทำรายงานการประเมินผลและเอกสารประกอบโครงงาน

## สมาชิกโครงงาน

| สมาชิก | รหัสนักศึกษา |
| --- | --- |
| Rangsiman Jerabunjerdchai | 66070501044 |
| Santipab Tongchan | 66070501056 |
| Kornchanok Phattanasiri | 66070503403 |
| Puwanut Theeranuluk | 66070503477 |

**Project Advisor:** Assoc.Prof.Dr. Santitham Prom-on

## การใช้งานอย่างรับผิดชอบ

โครงงานนี้เป็นต้นแบบเพื่อการศึกษา ข้อมูลทางการเงินอาจไม่ครบถ้วน ล่าช้า หรือมีข้อผิดพลาด และ Agent อาจสร้างผลลัพธ์ที่ไม่ถูกต้อง ผู้ใช้ควรตรวจสอบข้อมูลสำคัญกับแหล่งข้อมูลที่เชื่อถือได้ก่อนนำไปใช้จริง

ระบบนี้ทำหน้าที่เป็นเครื่องมือช่วยวิเคราะห์และช่วยตัดสินใจเท่านั้น ไม่ใช่คำแนะนำด้านการลงทุน และไม่มีอำนาจดำเนินธุรกรรมหรือส่งคำสั่งซื้อขายแทนผู้ใช้

## เอกสารอ้างอิง

- [Alpha Terminal - GitHub](https://github.com/ronitg1/alpha-terminal)
- [SEC EDGAR Application Programming Interfaces](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [XBRL US - Data Quality Committee Rules and Guidance](https://xbrl.us/home/priorities/data-quality/rules-guidance/)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
- [OpenBB Platform Documentation](https://docs.openbb.co/platform)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification)
- [NIST AI Risk Management Framework 1.0](https://www.nist.gov/itl/ai-risk-management-framework)
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)

---

_Built for CPE 401 - Computer Engineering Project_
