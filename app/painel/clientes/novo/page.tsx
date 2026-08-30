import { ClienteForm } from "../_components/ClienteForm";

export const metadata = { title: "Novo cliente" };

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Novo cliente</h1>
        <p className="text-sm text-slate-500">Cadastre um novo cliente para vincular a propostas.</p>
      </div>
      <ClienteForm />
    </div>
  );
}
