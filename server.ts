/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getDatabase, saveDatabase, resetDatabase } from './server-db';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent for AI Studio telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to check if API Key exists
function checkApiKey(res: express.Response) {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is missing on the server. Please add it via the Settings > Secrets menu.'
    });
    return false;
  }
  return true;
}

// API: Suggest details for a new barcode or partial product description
app.post('/api/gemini/suggest-product', async (req, res) => {
  if (!checkApiKey(res)) return;
  
  const { barcode, descriptionHint } = req.body;
  if (!barcode) {
    return res.status(400).json({ error: 'Barcode is required.' });
  }

  try {
    const prompt = `Você é o especialista de estoque e cadastro da Caninana Auto Vidros (loja especializada em vidros automotivos, para-brisas, faróis, lanternas, retrovisores, palhetas, borrachas e acessórios de carros).
Sugerir um cadastro profissional para o código de barras: ${barcode}.
Dica de descrição dada pelo usuário: ${descriptionHint || 'Nenhuma dica fornecida'}.

Gere um objeto JSON contendo:
1. "description": Uma descrição técnica, padronizada e limpa do produto (em português, ex: "Para-brisa Dianteiro Chevrolet Onix 2013 a 2019 Térmico Verde").
2. "category": Categoria exata (Ex: "Vidros Dianteiros", "Vidros Traseiros", "Vidros Laterais", "Retrovisores", "Faróis e Lanternas", "Palhetas", "Acessórios e Colas").
3. "application": Modelos de veículos e anos compatíveis de forma resumida (Ex: "Chevrolet Onix 2013, 2014, 2015, 2016, 2017, 2018, 2019").
4. "reasoning": Uma breve explicação do motivo da escolha comercial ou técnica desse formato.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: 'Descrição padronizada do produto' },
            category: { type: Type.STRING, description: 'Categoria do produto de auto vidros' },
            application: { type: Type.STRING, description: 'Aplicação automotiva detalhada' },
            reasoning: { type: Type.STRING, description: 'Breve explicação da IA' },
          },
          required: ['description', 'category', 'application', 'reasoning'],
        },
      },
    });

    const resultText = response.text || '{}';
    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error('Error suggesting product details:', error);
    res.status(500).json({ error: error.message || 'Falha ao sugerir produto.' });
  }
});

// API: Scan movements / inventory logs for potential errors or discrepancies
app.post('/api/gemini/detect-errors', async (req, res) => {
  if (!checkApiKey(res)) return;

  const { movements, inventory, currentProducts } = req.body;

  try {
    const prompt = `Analise a base de dados de movimentações e inventário de Auto Vidros para detectar possíveis erros operacionais de digitação ou leitura física.
Produtos Cadastrados: ${JSON.stringify(currentProducts || [])}
Movimentações Recentes: ${JSON.stringify(movements || [])}
Leituras do Inventário Atual: ${JSON.stringify(inventory || [])}

Identifique e descreva:
1. Possíveis erros de digitação de código de barras (Ex: códigos muito curtos, caracteres estranhos, formatos inválidos para EAN/UPC/Code128).
2. Quantidades anômalas (Ex: saída ou entrada de quantidades absurdas como 500 para-brisas em uma única nota sem histórico correspondente, ou quantidades negativas).
3. Inconsistência de movimentação (Ex: Saída de produto sem estoque disponível).

Retorne um JSON com uma lista estruturada de alertas contendo:
- "title": Título curto do problema.
- "severity": Gravidade ('high' | 'medium' | 'info').
- "description": Explicação detalhada e o produto/movimento envolvido.
- "action": Sugestão de como o operador pode corrigir.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ['title', 'severity', 'description', 'action'],
              }
            }
          },
          required: ['alerts'],
        },
      },
    });

    const resultText = response.text || '{"alerts": []}';
    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error('Error detecting errors:', error);
    res.status(500).json({ error: error.message || 'Falha ao analisar erros operacionais.' });
  }
});

// API: Generate Smart Executive Report
app.post('/api/gemini/smart-report', async (req, res) => {
  if (!checkApiKey(res)) return;

  const { products, movements, logs } = req.body;

  try {
    const prompt = `Gere um Relatório Gerencial Inteligente (Smart Report) em português para a diretoria da Caninana Auto Vidros.
Baseie-se nos dados reais do coletor de estoque:
- Produtos em estoque: ${JSON.stringify(products || [])}
- Movimentações recentes: ${JSON.stringify(movements || [])}
- Histórico de auditoria (logs): ${JSON.stringify(logs || [])}

O relatório deve conter seções claras e profissionais:
1. Sumário executivo da saúde do estoque (giro, quantidades gerais).
2. Análise de estoque crítico (quais para-brisas/vidros estão acabando e precisam de reposição imediata).
3. Destaques operacionais (movimentações mais frequentes, eficiência dos operadores).
4. Recomendações estratégicas de compra e prevenção de perdas com base nos padrões observados.

Formatado de forma limpa e objetiva para exibição na tela do smartphone (com títulos claros e marcadores).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ report: response.text || 'Nenhum relatório gerado.' });
  } catch (error: any) {
    console.error('Error generating smart report:', error);
    res.status(500).json({ error: error.message || 'Falha ao gerar relatório inteligente.' });
  }
});

// API: Match inventory against products to find discrepancies
app.post('/api/gemini/inventory-discrepancies', async (req, res) => {
  if (!checkApiKey(res)) return;

  const { products, inventory } = req.body;

  try {
    const prompt = `Analise o Inventário Físico coletado (contagem nas prateleiras) contra o Estoque Teórico do sistema para a Caninana Auto Vidros.
Estoque Teórico Atual (Sistema): ${JSON.stringify(products || [])}
Estoque Físico Contado: ${JSON.stringify(inventory || [])}

Identifique todas as discrepâncias (onde a quantidade contada é diferente da teórica do sistema).
Retorne um objeto JSON contendo:
1. "discrepancies": Uma lista de objetos com:
   - "barcode": Código de barras
   - "description": Nome do produto
   - "systemQty": Quantidade teórica no sistema
   - "countedQty": Quantidade física contada
   - "difference": A diferença (físico - sistema)
   - "status": Situação ('Sobra' | 'Falta' | 'Correto')
   - "financialImpact": Estimativa qualitativa de impacto comercial ('Crítico' | 'Médio' | 'Baixo')
2. "summary": Um breve texto resumido sobre o resultado da auditoria de inventário geral.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            discrepancies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  barcode: { type: Type.STRING },
                  description: { type: Type.STRING },
                  systemQty: { type: Type.NUMBER },
                  countedQty: { type: Type.NUMBER },
                  difference: { type: Type.NUMBER },
                  status: { type: Type.STRING },
                  financialImpact: { type: Type.STRING },
                },
                required: ['barcode', 'description', 'systemQty', 'countedQty', 'difference', 'status', 'financialImpact'],
              }
            },
            summary: { type: Type.STRING }
          },
          required: ['discrepancies', 'summary']
        }
      }
    });

    const resultText = response.text || '{"discrepancies": [], "summary": ""}';
    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error('Error analyzing discrepancies:', error);
    res.status(500).json({ error: error.message || 'Falha ao analisar divergências.' });
  }
});

// Load full database from server
app.get('/api/db/load', (req, res) => {
  try {
    const db = getDatabase();
    res.json({ success: true, data: db });
  } catch (error: any) {
    console.error('Error loading database:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao carregar banco de dados.' });
  }
});

// Sync data (movements, inventory, new products, logs, users) to server
app.post('/api/db/sync', (req, res) => {
  try {
    const { movements, inventory, logs, newProducts, users } = req.body;
    const db = getDatabase();

    // 1. Sync Products (including stock updates and new products)
    if (newProducts && Array.isArray(newProducts)) {
      newProducts.forEach((newP: any) => {
        if (!db.products.some(p => p.barcode === newP.barcode)) {
          db.products.push(newP);
        }
      });
    }

    // Process movements to update stock
    if (movements && Array.isArray(movements)) {
      movements.forEach((mov: any) => {
        // Add to movements if not already present
        if (!db.movements.some(m => m.id === mov.id)) {
          db.movements.push({ ...mov, synced: true });

          // Update product stock accordingly
          const product = db.products.find(p => p.barcode === mov.barcode);
          if (product) {
            if (mov.type === 'Entrada') {
              product.stock += mov.quantity;
            } else if (mov.type === 'Saída') {
              product.stock = Math.max(0, product.stock - mov.quantity);
            }
          }
        }
      });
    }

    // Process inventory
    if (inventory && Array.isArray(inventory)) {
      inventory.forEach((inv: any) => {
        // Add or merge inventory count
        const existingIdx = db.inventory.findIndex(item => item.barcode === inv.barcode && !item.synced);
        if (existingIdx > -1) {
          db.inventory[existingIdx].countedQuantity += inv.countedQuantity;
          db.inventory[existingIdx].date = inv.date;
        } else {
          db.inventory.push({ ...inv, synced: true });
        }
      });
    }

    // Process logs
    if (logs && Array.isArray(logs)) {
      logs.forEach((log: any) => {
        if (!db.logs.some(l => l.id === log.id)) {
          db.logs.push(log);
        }
      });
    }

    // Process users database updates if provided
    if (users && Array.isArray(users)) {
      db.users = users;
    }

    saveDatabase(db);
    res.json({ success: true, data: db });
  } catch (error: any) {
    console.error('Error syncing database:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao sincronizar banco de dados.' });
  }
});

// Reset database to initial values
app.post('/api/db/reset', (req, res) => {
  try {
    const db = resetDatabase();
    res.json({ success: true, data: db });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao resetar banco de dados.' });
  }
});

// GitHub Integration Backup Endpoint
app.post('/api/db/github-backup', async (req, res) => {
  try {
    const { token, repo, branch, filepath, content, message } = req.body;

    if (!token || !repo || !filepath || !content) {
      return res.status(400).json({ success: false, error: 'Token, Repositório, Caminho do arquivo e Conteúdo são obrigatórios.' });
    }

    const targetUrl = `https://api.github.com/repos/${repo}/contents/${filepath}`;
    const headers: Record<string, string> = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Caninana-Coletor-App'
    };

    // Step 1: Check if the file already exists to get its SHA hash
    let sha: string | undefined = undefined;
    try {
      const getResponse = await fetch(`${targetUrl}?ref=${branch || 'main'}`, {
        method: 'GET',
        headers
      });

      if (getResponse.status === 200) {
        const fileInfo: any = await getResponse.json();
        sha = fileInfo.sha;
      }
    } catch (e) {
      console.log('File does not exist yet or connection error. Creating a new file.', e);
    }

    // Step 2: Upload or Update file on GitHub
    const putBody = {
      message: message || 'Backup do coletor Caninana Auto Vidros',
      content: Buffer.from(content).toString('base64'),
      branch: branch || 'main',
      sha
    };

    const putResponse = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    const putData: any = await putResponse.json();

    if (putResponse.status === 200 || putResponse.status === 201) {
      res.json({ success: true, message: 'Backup enviado com sucesso para o GitHub!', commit: putData.commit });
    } else {
      res.status(putResponse.status).json({ success: false, error: putData.message || 'Erro ao enviar backup para o GitHub.' });
    }
  } catch (error: any) {
    console.error('GitHub Backup error:', error);
    res.status(500).json({ success: false, error: error.message || 'Falha de comunicação com o GitHub.' });
  }
});

// Vite Middleware integration for development / production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Caninana Backend] Express server running on port ${PORT}`);
  });
}

startServer();
