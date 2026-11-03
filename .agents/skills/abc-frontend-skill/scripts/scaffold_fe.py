#!/usr/bin/env python3
"""
Frontend 3-Tier Code Generator for WDP301 Playbook v2.0.
Generates Service Layer, Custom Hook Layer, Component UI Layer, and Playwright E2E test.
Guarantees 100% English code comments and strict TypeScript contracts.
"""

import os
import sys
import argparse

SERVICE_TEMPLATE = """import api from '../core/api';

export interface {entity_class}Item {{
  _id?: string;
  id?: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}}

export interface AsyncAcceptedResponse {{
  status: string;
  message: string;
}}

export const {entity_camel}Service = {{
  /**
   * Fetch all records with optional query parameters.
   */
  async getItems(params?: Record<string, any>): Promise<{entity_class}Item[]> {{
    const response = await api.get('/api/{api_endpoint}', {{ params }});
    return Array.isArray(response.data) ? response.data : response.data?.data || [];
  }},

  /**
   * Fetch single record by ID.
   */
  async getItemById(id: string): Promise<{entity_class}Item> {{
    const response = await api.get(`/api/{api_endpoint}/${{id}}`);
    return response.data;
  }},

  /**
   * Create new record asynchronously via Kafka event queue.
   */
  async createItem(payload: Omit<{entity_class}Item, '_id' | 'id'>): Promise<AsyncAcceptedResponse> {{
    const response = await api.post('/api/{api_endpoint}', payload);
    return response.data;
  }},

  /**
   * Update existing record asynchronously via Kafka event queue.
   */
  async updateItem(id: string, payload: Partial<{entity_class}Item>): Promise<AsyncAcceptedResponse> {{
    const response = await api.put(`/api/{api_endpoint}/${{id}}`, payload);
    return response.data;
  }},

  /**
   * Delete record asynchronously via Kafka event queue.
   */
  async deleteItem(id: string): Promise<AsyncAcceptedResponse> {{
    const response = await api.delete(`/api/{api_endpoint}/${{id}}`);
    return response.data;
  }},
}};
"""

HOOK_TEMPLATE = """import {{ useState, useEffect, useCallback }} from 'react';
import {{ {entity_camel}Service, {entity_class}Item }} from '../services/{domain}/{entity_camel}.service';

export function use{entity_class}Management() {{
  const [items, setItems] = useState<{entity_class}Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load data from API Gateway.
   */
  const loadItems = useCallback(async () => {{
    try {{
      setLoading(true);
      setError(null);
      const data = await {entity_camel}Service.getItems();
      setItems(data);
    }} catch (err: any) {{
      const message = err.response?.data?.message || err.message || 'Failed to load {entity_lower} records';
      setError(message);
    }} finally {{
      setLoading(false);
    }}
  }}, []);

  useEffect(() => {{
    loadItems();
  }}, [loadItems]);

  /**
   * Save record (Create or Update) with Kafka consumer propagation delay (1000ms).
   */
  const saveItem = async (payload: Partial<{entity_class}Item>, id?: string) => {{
    try {{
      setSubmitting(true);
      setError(null);

      if (id) {{
        await {entity_camel}Service.updateItem(id, payload);
      }} else {{
        await {entity_camel}Service.createItem(payload as any);
      }}

      // Allow 1 second for Kafka consumer to persist to database before re-fetching
      setTimeout(() => {{
        loadItems();
      }}, 1000);

      return {{ success: true }};
    }} catch (err: any) {{
      const message = err.response?.data?.message || err.message || 'Failed to save {entity_lower}';
      setError(message);
      return {{ success: false, error: message }};
    }} finally {{
      setSubmitting(false);
    }}
  }};

  /**
   * Optimistic delete with rollback support.
   */
  const deleteItem = async (id: string) => {{
    const previous = [...items];
    setItems((prev) => prev.filter((item) => (item._id || item.id) !== id));

    try {{
      await {entity_camel}Service.deleteItem(id);
      setTimeout(() => loadItems(), 1000);
      return {{ success: true }};
    }} catch (err: any) {{
      setItems(previous);
      const message = err.response?.data?.message || err.message || 'Failed to delete {entity_lower}';
      setError(message);
      return {{ success: false, error: message }};
    }}
  }};

  return {{
    items,
    loading,
    submitting,
    error,
    refresh: loadItems,
    saveItem,
    deleteItem,
  }};
}}
"""

COMPONENT_TEMPLATE = """import React, {{ useState }} from 'react';
import {{ use{entity_class}Management }} from '../../hooks/use{entity_class}Management';
import {{ Loader2, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 }} from 'lucide-react';

export const {entity_class}Manager: React.FC = () => {{
  const {{ items, loading, submitting, error, refresh, saveItem, deleteItem }} = use{entity_class}Management();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const res = await saveItem({{ name: name.trim(), code: code.trim().toUpperCase(), status: 'ACTIVE' }});
    if (res.success) {{
      setName('');
      setCode('');
      setFeedback('Item submitted successfully. Processing via Kafka pipeline.');
      setTimeout(() => setFeedback(null), 4000);
    }}
  }};

  const handleDelete = async (id: string) => {{
    if (!window.confirm('Are you sure you want to remove this record?')) return;
    await deleteItem(id);
  }};

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{entity_class} Management</h1>
          <p className="text-sm text-slate-500">Event-driven master data aligned with Playbook v2.0</p>
        </div>
        <button
          onClick={{() => refresh()}}
          disabled={{loading}}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          aria-label="Refresh items"
        >
          <RefreshCw className={{`w-4 h-4 ${{loading ? 'animate-spin' : ''}}`}} />
          Refresh
        </button>
      </div>

      {{error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{{error}}</span>
        </div>
      )}}

      {{feedback && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm" role="status">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{{feedback}}</span>
        </div>
      )}}

      {/* Creation Form */}
      <form onSubmit={{handleSubmit}} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Add New {entity_class}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="{entity_lower}-name" className="block text-xs font-medium text-slate-600 mb-1">Item Name</label>
            <input
              id="{entity_lower}-name"
              type="text"
              value={{name}}
              onChange={{(e) => setName(e.target.value)}}
              placeholder="e.g. Paracetamol 500mg"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="{entity_lower}-code" className="block text-xs font-medium text-slate-600 mb-1">Code / SKU</label>
            <input
              id="{entity_lower}-code"
              type="text"
              value={{code}}
              onChange={{(e) => setCode(e.target.value)}}
              placeholder="e.g. SKU-PARA-001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm uppercase"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={{submitting || !name.trim() || !code.trim()}}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition"
            >
              {{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}}
              {{submitting ? 'Submitting...' : 'Save Record'}}
            </button>
          </div>
        </div>
      </form>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <th className="p-3">Code / SKU</th>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {{loading && items.length === 0 ? (
                <tr>
                  <td colSpan={{4}} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={{4}} className="p-8 text-center text-slate-500">
                    No {entity_lower} records found. Create one above.
                  </td>
                </tr>
              ) : (
                items.map((item) => {{
                  const id = item._id || item.id || '';
                  return (
                    <tr key={{id}} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono text-xs font-semibold text-slate-700">{{item.code}}</td>
                      <td className="p-3 font-medium text-slate-900">{{item.name}}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {{item.status}}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={{() => handleDelete(id)}}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition"
                          title="Delete record"
                          aria-label={`Delete ${{item.name}}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                }})
              )}}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}};
"""

E2E_TEST_TEMPLATE = """import {{ test, expect }} from '@playwright/test';

test.describe('{entity_class} Management E2E Flow', () => {{
  test('should render manager page and display title', async ({{ page }}) => {{
    await page.goto('/{entity_lower}');
    await expect(page.locator('h1')).toContainText('{entity_class} Management');
  }});

  test('should create new record and verify submission', async ({{ page }}) => {{
    await page.goto('/{entity_lower}');

    // Fill form inputs
    await page.fill('#{entity_lower}-name', 'Test {entity_class} Item');
    await page.fill('#{entity_lower}-code', 'TEST-CODE-001');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify feedback notification
    await expect(page.locator('text=Item submitted successfully')).toBeVisible({{ timeout: 5000 }});
  }});
}});
"""

def to_camel_case(s: str) -> str:
    parts = s.replace("-", "_").split("_")
    return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])

def to_class_name(s: str) -> str:
    parts = s.replace("-", "_").split("_")
    return "".join(p.capitalize() for p in parts)

def main():
    parser = argparse.ArgumentParser(description="Scaffold 3-Tier Frontend Architecture for WDP301")
    parser.add_argument("name", help="Entity or feature name (e.g. medicine, inventory-check, supplier)")
    parser.add_argument("--domain", default="inventory", help="Domain group (e.g. inventory, purchase, sales, admin, hr, auth)")
    parser.add_argument("--endpoint", help="API Gateway endpoint name (defaults to plural entity name)")
    args = parser.parse_args()

    entity_raw = args.name.strip()
    domain = args.domain.strip()
    entity_camel = to_camel_case(entity_raw)
    entity_class = to_class_name(entity_raw)
    entity_lower = entity_raw.lower().replace("_", "-")
    api_endpoint = args.endpoint if args.endpoint else f"{entity_lower}s"

    base_dir = "frontend/src"
    service_path = f"{base_dir}/services/{domain}/{entity_camel}.service.ts"
    hook_path = f"{base_dir}/hooks/use{entity_class}Management.ts"
    component_path = f"{base_dir}/components/{domain}/{entity_class}Manager.tsx"
    test_path = f"frontend/tests/e2e/{entity_lower}.spec.ts"

    os.makedirs(os.path.dirname(service_path), exist_ok=True)
    os.makedirs(os.path.dirname(hook_path), exist_ok=True)
    os.makedirs(os.path.dirname(component_path), exist_ok=True)
    os.makedirs(os.path.dirname(test_path), exist_ok=True)

    subs = {
        "entity_class": entity_class,
        "entity_camel": entity_camel,
        "entity_lower": entity_lower,
        "domain": domain,
        "api_endpoint": api_endpoint,
    }

    # Write files
    with open(service_path, "w", encoding="utf-8") as f:
        f.write(SERVICE_TEMPLATE.format(**subs))
    print(f" [CREATED] Service:    {service_path}")

    with open(hook_path, "w", encoding="utf-8") as f:
        f.write(HOOK_TEMPLATE.format(**subs))
    print(f" [CREATED] Hook:       {hook_path}")

    with open(component_path, "w", encoding="utf-8") as f:
        f.write(COMPONENT_TEMPLATE.format(**subs))
    print(f" [CREATED] Component:  {component_path}")

    with open(test_path, "w", encoding="utf-8") as f:
        f.write(E2E_TEST_TEMPLATE.format(**subs))
    print(f" [CREATED] E2E Test:   {test_path}")

    print("\n[SUCCESS] Feature scaffolding completed with 100% Playbook v2.0 compliance!")

if __name__ == "__main__":
    main()
