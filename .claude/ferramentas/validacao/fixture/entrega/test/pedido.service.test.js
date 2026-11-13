import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPedido } from '../src/pedidos/pedido.service.js';

test('cria o pedido quando há estoque', async () => {
  const cliente = { id: 7, cpf: '000.000.000-00', email: 'cliente@exemplo.test' };
  const pedido = await criarPedido(cliente, [{ produtoId: 1, nome: 'Produto 1', quantidade: 2 }]);
  assert.ok(pedido);
});

test('recusa quando falta estoque', async () => {
  await assert.rejects(() => criarPedido({ id: 7 }, [{ produtoId: 2, nome: 'Produto 2', quantidade: 3 }]));
});
