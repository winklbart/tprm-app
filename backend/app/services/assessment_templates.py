"""
Generates questionnaire templates based on assessment type and vendor criticality.
Questions are stored as JSONB: [{"id": str, "question": str, "type": "yesno"|"text"|"multiline"}]
"""

_SHORT = [
    {"id": "q1",  "question": "Do you have a formal information security policy?", "type": "yesno"},
    {"id": "q2",  "question": "Do you perform background checks on employees with access to customer data?", "type": "yesno"},
    {"id": "q3",  "question": "How is customer data encrypted at rest and in transit?", "type": "text"},
    {"id": "q4",  "question": "Do you have a documented data breach notification process?", "type": "yesno"},
    {"id": "q5",  "question": "Do you have a business continuity and disaster recovery plan?", "type": "yesno"},
]

_STANDARD = _SHORT + [
    {"id": "q6",  "question": "Do you hold ISO 27001, SOC 2, or an equivalent certification?", "type": "yesno"},
    {"id": "q7",  "question": "How frequently do you conduct internal or external security audits?", "type": "text"},
    {"id": "q8",  "question": "Is multi-factor authentication enforced for all systems handling customer data?", "type": "yesno"},
    {"id": "q9",  "question": "How do you manage and monitor your own third-party vendor risk?", "type": "text"},
    {"id": "q10", "question": "Describe your patch management and vulnerability remediation process.", "type": "multiline"},
]

_FULL = _STANDARD + [
    {"id": "q11", "question": "Do you conduct annual penetration testing by an accredited third party?", "type": "yesno"},
    {"id": "q12", "question": "Describe your incident response plan and escalation procedures.", "type": "multiline"},
    {"id": "q13", "question": "How are cryptographic keys managed, stored, and rotated?", "type": "text"},
    {"id": "q14", "question": "Do you have a dedicated CISO or equivalent security leadership role?", "type": "yesno"},
    {"id": "q15", "question": "Which data privacy regulations are you certified or compliant with (e.g. GDPR, CCPA, HIPAA)?", "type": "multiline"},
]

_TRUST_CENTER = [
    {"id": "tc1", "question": "Provide your Trust Center URL or public security documentation page.", "type": "text"},
    {"id": "tc2", "question": "List all compliance certifications currently held (e.g. SOC 2, ISO 27001, PCI-DSS).", "type": "multiline"},
    {"id": "tc3", "question": "When was your last third-party security audit completed?", "type": "text"},
    {"id": "tc4", "question": "Which security reports are available to customers upon request?", "type": "multiline"},
    {"id": "tc5", "question": "Are your security policies and procedures available for review by customers?", "type": "yesno"},
]

_ACCESS_TO_INFO = [
    {"id": "ai1", "question": "Provide your most recent SOC 2 Type II report or equivalent audit report.", "type": "multiline"},
    {"id": "ai2", "question": "Provide your penetration test report from the last 12 months.", "type": "multiline"},
    {"id": "ai3", "question": "Provide your data processing agreement (DPA) template.", "type": "multiline"},
    {"id": "ai4", "question": "Provide your incident response and breach notification procedures.", "type": "multiline"},
    {"id": "ai5", "question": "Provide evidence of active cyber liability insurance coverage.", "type": "multiline"},
]


def get_template_questions(assessment_type: str, vendor_criticality: str) -> list[dict]:
    if assessment_type == "self_assessment":
        if vendor_criticality in ("High", "Critical"):
            return [q.copy() for q in _FULL]
        elif vendor_criticality == "Medium":
            return [q.copy() for q in _STANDARD]
        else:
            return [q.copy() for q in _SHORT]
    elif assessment_type == "trust_center":
        return [q.copy() for q in _TRUST_CENTER]
    elif assessment_type == "access_to_information":
        return [q.copy() for q in _ACCESS_TO_INFO]
    else:
        return []
