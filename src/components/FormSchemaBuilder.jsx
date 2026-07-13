'use client';

// FormSchemaBuilder - UI ให้ครูสร้าง/แก้ไข form_schema ของข่าวโหมด registration_form
// ควบคุม array ของ field ({id, type, label, required, options?, placeholder?})
// ผ่าน props schema/onChange — ตัว component เองไม่เก็บ state ถาวร (controlled)

const FIELD_TYPES = [
  { value: 'text', label: 'ข้อความ (Text)' },
  { value: 'dropdown', label: 'ตัวเลือก (Dropdown)' },
  { value: 'checkbox', label: 'checkbox' },
];

const slugify = (label) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^฀-๿a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';

const uniqueId = (base, existingIds) => {
  if (!existingIds.includes(base)) return base;
  let i = 2;
  while (existingIds.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
};

const emptyField = (existingIds) => ({
  id: uniqueId('field', existingIds),
  type: 'text',
  label: '',
  required: false,
  options: [],
  placeholder: '',
});

const FormSchemaBuilder = ({ schema, onChange }) => {
  const fields = schema || [];

  const updateField = (index, patch) => {
    const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  };

  const updateLabel = (index, label) => {
    const existingIds = fields.filter((_, i) => i !== index).map((f) => f.id);
    const field = fields[index];
    // auto-slugify id จาก label เฉพาะตอนที่ id ยังเป็นค่า auto-generate เดิม (ไม่ได้ตั้งเอง)
    const shouldAutoId = !field.id || field.id === slugify(field.label || '');
    const patch = { label };
    if (shouldAutoId && label.trim()) {
      patch.id = uniqueId(slugify(label), existingIds);
    }
    updateField(index, patch);
  };

  const addField = () => {
    const existingIds = fields.map((f) => f.id);
    onChange([...fields, emptyField(existingIds)]);
  };

  const removeField = (index) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const updateOptions = (index, text) => {
    const options = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(index, { options });
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-8 px-5 text-center text-gray-400 text-sm">
          ยังไม่มีช่องกรอกข้อมูล กดปุ่มด้านล่างเพื่อเพิ่ม
        </div>
      )}

      {fields.map((field, index) => (
        <div key={index} className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 w-6">#{index + 1}</span>
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              placeholder="label เช่น ชื่อ-นามสกุล"
              value={field.label}
              onChange={(e) => updateLabel(index, e.target.value)}
            />
            <select
              className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              value={field.type}
              onChange={(e) => updateField(index, { type: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="w-8 h-8 rounded-lg border-none bg-gray-100 hover:bg-gray-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => moveField(index, -1)}
              disabled={index === 0}
              title="เลื่อนขึ้น"
            >
              ↑
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg border-none bg-gray-100 hover:bg-gray-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => moveField(index, 1)}
              disabled={index === fields.length - 1}
              title="เลื่อนลง"
            >
              ↓
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg border-none bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
              onClick={() => removeField(index)}
              title="ลบ"
            >
              ✕
            </button>
          </div>

          {field.type === 'dropdown' && (
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              placeholder="ตัวเลือก คั่นด้วยจุลภาค เช่น กีตาร์, เปียโน, กลอง"
              value={(field.options || []).join(', ')}
              onChange={(e) => updateOptions(index, e.target.value)}
            />
          )}

          {field.type === 'text' && (
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              placeholder="placeholder (ถ้ามี)"
              value={field.placeholder || ''}
              onChange={(e) => updateField(index, { placeholder: e.target.value })}
            />
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer"
                checked={field.required}
                onChange={(e) => updateField(index, { required: e.target.checked })}
              />
              <span>บังคับกรอก</span>
            </label>
            <span className="text-gray-300">id: {field.id}</span>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold border border-blue-100 cursor-pointer self-start"
        onClick={addField}
      >
        + เพิ่มช่องกรอกข้อมูล
      </button>
    </div>
  );
};

export default FormSchemaBuilder;
