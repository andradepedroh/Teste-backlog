export const db = {
  async query() {
    return [];
  },
  async insert(tabela, dados) {
    return { id: 1, tabela, ...dados };
  },
};
