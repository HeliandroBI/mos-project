import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getListItems, createListItem, updateListItem, normalizeContaItem, getCurrentUser } from "./services/sp";

const DataContext = createContext(null);

// Nomes exatos das listas no SharePoint
const LIST_CONTAS    = "fContasReceber";
const LIST_STATUS    = "Dim_StatusCR";
const LIST_ESCOPO    = "Dim_EspocoCR";
const LIST_EMPRESA   = "Dim_EmpresaFatCR";

export function DataProvider({ children }) {
  const [contas,       setContas]       = useState([]);
  const [dimStatus,    setDimStatus]    = useState([]);
  const [dimEscopo,    setDimEscopo]    = useState([]);
  const [dimEmpresa,   setDimEmpresa]   = useState([]);
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [loadingMsg,   setLoadingMsg]   = useState("Autenticando...");
  const [error,        setError]        = useState(null);

  // Carrega tudo na inicialização — único ponto de auth para todas as páginas
  useEffect(() => {
    async function bootstrap() {
      try {
        setLoadingMsg("Autenticando no Microsoft 365...");
        const u = await getCurrentUser();
        if (u) setUser(u);

        setLoadingMsg("Carregando Status...");
        const [statusItems, escopoItems, empresaItems] = await Promise.all([
          getListItems(LIST_STATUS,  "ID,StatusID,Status"),
          getListItems(LIST_ESCOPO,  "ID,EscopoID,Escopo"),
          getListItems(LIST_EMPRESA, "ID,EmpresaFatID,EmpresaFat"),
        ]);
        setDimStatus(statusItems);
        setDimEscopo(escopoItems);
        setDimEmpresa(empresaItems);

        setLoadingMsg("Carregando Contas a Receber...");
        const contasItems = await getListItems(LIST_CONTAS);
        setContas(contasItems.map(normalizeContaItem));

        setLoadingMsg("Concluído.");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  // Adiciona nova conta no SP e atualiza estado local
  const addConta = useCallback(async (fields) => {
    const created = await createListItem(LIST_CONTAS, fields);
    setContas(prev => [...prev, normalizeContaItem(created)]);
    return created;
  }, []);

  // Atualiza conta no SP e reflete no estado local
  const updateConta = useCallback(async (spId, fields) => {
    await updateListItem(LIST_CONTAS, spId, fields);
    setContas(prev => prev.map(r =>
      r.id === spId ? normalizeContaItem({ ...r, ...fields, ID: spId }) : r
    ));
  }, []);

  // Listas derivadas para dropdowns delegáveis
  const statusList   = dimStatus.map(s => ({ id: s.StatusID,     label: s.Status    }));
  const escopoList   = dimEscopo.map(e => ({ id: e.EscopoID,     label: e.Escopo    }));
  const empresaList  = dimEmpresa.map(e => ({ id: e.EmpresaFatID, label: e.EmpresaFat }));

  // Clientes e Plataformas únicos derivados dos dados reais
  const clienteList   = [...new Set(contas.map(r => r.cliente).filter(Boolean))].sort();
  const plataformaList = [...new Set(contas.map(r => r.plataforma).filter(Boolean))].sort();

  return (
    <DataContext.Provider value={{
      contas, setContas, addConta, updateConta,
      dimStatus, dimEscopo, dimEmpresa,
      statusList, escopoList, empresaList,
      clienteList, plataformaList,
      user, loading, loadingMsg, error,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de <DataProvider>");
  return ctx;
};
