# Padrão de Confirmação para Exclusões

Um padrão reutilizável para confirmações elegantes de exclusão, substituindo `window.confirm()` por um Dialog.

## Como Aplicar em Qualquer Componente

### 1. **Adicione os Estados**

```javascript
const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
const [itemToDelete, setItemToDelete] = useState({ type: null, id: null, name: "" });
const [deleteLoading, setDeleteLoading] = useState(false);
```

### 2. **Crie Funções para Abrir a Confirmação**

```javascript
const openDeleteConfirm = (id, name, type = "item") => {
  setItemToDelete({ type, id, name });
  setDeleteConfirmDialog(true);
};

const deleteItem = async (id) => {
  setDeleteLoading(true);
  try {
    await api.delete(`/endpoint/${id}`);
    toast.success("Item excluído com sucesso");
    setDeleteConfirmDialog(false);
    // Recarregar dados aqui
  } catch (e) {
    toast.error("Erro ao excluir");
  } finally {
    setDeleteLoading(false);
  }
};
```

### 3. **Substitua o window.confirm() por openDeleteConfirm()**

**Antes:**
```javascript
onClick={() => {
  if (window.confirm("Tem certeza?")) {
    deleteItem(id);
  }
}}
```

**Depois:**
```javascript
onClick={() => openDeleteConfirm(id, itemName, "item")}
```

### 4. **Adicione o Dialog no Final do Componente**

```javascript
<Dialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="text-red-600">
        Confirmar Exclusão de {itemToDelete.type}
      </DialogTitle>
    </DialogHeader>
    <div className="py-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Tem certeza que deseja excluir <strong className="text-foreground">{itemToDelete.name}</strong>?
      </p>
      <p className="text-xs text-muted-foreground bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200 dark:border-red-800">
        ⚠️ Esta ação é irreversível.
      </p>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleteConfirmDialog(false)}>
        Cancelar
      </Button>
      <Button
        variant="destructive"
        onClick={() => deleteItem(itemToDelete.id)}
        disabled={deleteLoading}
      >
        {deleteLoading ? "Deletando..." : "Sim, excluir"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Exemplos de Implementação

### ✅ Já Implementado

- **AdminPage.jsx** - Deletar usuários
- **AdminTraining.jsx** - Deletar cursos e módulos

### 🔧 Próximos Candidatos

1. **ArticleViewPage.jsx** - Deletar artigos
2. **FilesPage.jsx** - Deletar arquivos

## Para Múltiplos Tipos de Exclusão

Se você tem vários tipos de itens a deletar (como em AdminTraining com curso e módulo), use um campo `type` para diferenciar:

```javascript
// Abrir confirmação com tipo
openDeleteConfirm(courseId, courseName, "course");
openDeleteConfirm(moduleId, moduleName, "module");

// No Dialog, adicione condicionais:
{itemToDelete.type === "course" && (
  <p>⚠️ Removerá também todos os módulos...</p>
)}
{itemToDelete.type === "module" && (
  <p>⚠️ Removerá também todos os quizzes...</p>
)}

// Na ação, diferencie:
if (itemToDelete.type === "course") {
  deleteCourse(itemToDelete.id);
} else if (itemToDelete.type === "module") {
  deleteModule(itemToDelete.id);
}
```

## Vantagens

✅ Mais elegante e profissional
✅ Customizável com avisos específicos
✅ Melhor UX (sem popups do navegador)
✅ Fácil de reutilizar
✅ Reutilizável com um único Dialog para vários tipos
