/**
 * Corredores complementarios de Lima (bus) — alternativa "Bus" en la comparación de YIO.
 *
 * Fuente: webs oficiales de cada corredor, transcrito el 10 nov 2026.
 *   Azul:   https://corredorazul.pe/servicio/ (301), /servicio-302/, /servicio-303/, /servicio-306/
 *   Morado: https://corredormorado.pe/servicio-404/, /servicio-405/, /servicio-409/, /servicio-412/
 * Pendiente: Morado SE-02 y Corredor Rojo (app en tiempo real, sin datos en texto).
 * Pendiente: coordenadas de paraderos (no están en las webs; buscar GTFS de Lima o mapear a mano).
 *
 * Nombres de paraderos como los publica cada operador, con tildes y erratas obvias corregidas
 * (ej. "Madris" → "Madrid", "Hospital PN" → "Hospital PNP").
 */

export type BusService = {
  id: string;
  corridor: "azul" | "morado" | "rojo";
  origin: string;
  destination: string;
  fare: { general: number; student: number };
  hours: string;
  stops: { ida: string[]; vuelta: string[] };
  source: string;
};

/** Tarifa promocional para viajes cortos en 14 rutas de Rojo, Azul y Morado (ATU). */
export const SHORT_TRIP_FARE = 1.0;

const FARE = { general: 2.2, student: 1.1 };

export const busServices: BusService[] = [
  // ───────────── CORREDOR AZUL ─────────────
  {
    id: "301", corridor: "azul", origin: "Rímac", destination: "Barranco", fare: FARE,
    hours: "Lun–Sáb 5:00–24:00 · Dom 5:00–23:00",
    source: "https://corredorazul.pe/servicio/",
    stops: {
      ida: ["Amancaes","La Colonia","Madrid","L. Prado","G. Republicana","Chira","Virú","Ica","Moquegua","Ilo","Bolivia","España","Tarma","Saco Oliveros","Ramón Dagnino","Cuba","E. Villar","Manuel Segura","Manuel Candamo","Tomás Guido","Soledad","M. Bañon","Paz Soldán","Choquehuanca","R. Morales","Los Ángeles","Andalucía","Ayacucho","Angamos","Piura","Pardo","Berlín","28 de Julio","Larco","Armendáriz","Loyola","La Paz","Chipoco","Balta","Plaza Butters"],
      vuelta: ["El Sol","Chipoco","Las Acacias","N. Balboa","Fanning","28 de Julio","Benavides","Shell","Ricardo Palma","Piura","Angamos","Ayacucho","Tenaud","Río de Janeiro","Aramburú","La Habana","Juan de Arona","Olavide","D. Casanova","Tomás Guido","Manuel Candamo","Manuel Segura","E. Villar","E. Fernández","Ramón Dagnino","Saco Oliveros","España","Bolivia","Quilca","Emancipación","Callao","Pizarro","Chira","G. Republicana","Alcázar","Las Calezas","Arancibia","Amancaes"],
    },
  },
  {
    id: "302", corridor: "azul", origin: "Rímac", destination: "Miraflores", fare: FARE,
    hours: "Lun–Sáb 5:00–23:00",
    source: "https://corredorazul.pe/servicio-302/",
    stops: {
      ida: ["Amancaes","La Colonia","Madrid","L. Prado","G. Republicana","Chira","Virú","Ica","Moquegua","Ilo","Bolivia","España","Tarma","Saco Oliveros","Ramón Dagnino","Cuba","E. Villar","Manuel Segura","Manuel Candamo","Tomás Guido","Soledad","M. Bañon","Paz Soldán","Choquehuanca","R. Morales","Los Ángeles","Andalucía","Ayacucho","Angamos","Piura","Dos de Mayo"],
      vuelta: ["Piura","Angamos","Ayacucho","Tenaud","Río de Janeiro","Aramburú","La Habana","Juan de Arona","Olavide","Casanova","Tomás Guido","M. Candamo","M. Segura","E. Villar","E. Fernández","R. Dagnino","Saco Oliveros","España","Bolivia","Quilca","Emancipación","Callao","Pizarro","Chira","G. Republicana","Alcázar","Las Calezas","F. Arancibia","Amancaes"],
    },
  },
  {
    id: "303", corridor: "azul", origin: "Rímac", destination: "Miraflores", fare: FARE,
    hours: "Lun–Sáb 6:00–21:00",
    source: "https://corredorazul.pe/servicio-303/",
    stops: {
      ida: ["Túnel","Pizarro","Huancavelica","N. Piérola","Villarán","España","Tarma","Natalio Sánchez","Cuba","M. Segura","Risso","Soledad","M. Bañon","R. Morales","Angamos","Dos de Mayo"],
      vuelta: ["Angamos","Aramburú","Olavide","D. Casanova","B. Alcedo","M. Segura","E. Fernández","Saco Oliveros","España","Bolivia","Uruguay","Moquegua","Ica","Pizarro","Moquegua (Final)"],
    },
  },
  {
    id: "306", corridor: "azul", origin: "Rímac", destination: "San Isidro", fare: FARE,
    hours: "Lun–Dom 5:00–23:00",
    source: "https://corredorazul.pe/servicio-306/",
    stops: {
      ida: ["Amancaes","Pasaje 27","Cerezos","Claveles","24 de Junio","E. Dibós","C. Valderrama","Calle 2","La Colonia","Madrid","L. Prado","Virú","Huancavelica","N. Piérola","Villarán","España","Tarma","Natalio Sánchez","Cuba","M. Segura","M. Candamo","Tomás Guido","Soledad"],
      vuelta: ["Olavide","D. Casanova","Tomás Guido","M. Candamo","M. Segura","E. Fernández","Saco Oliveros","España","Bolivia","Uruguay","Moquegua","Ica","Pizarro","L. Prado","Las Calezas","Arancibia","Calle 3","El Sol","Calle 10","24 de Junio","Claveles","Cerezos","Pasaje 17","Mónaco"],
    },
  },

  // ───────────── CORREDOR MORADO ─────────────
  {
    id: "404", corridor: "morado", origin: "San Juan de Lurigancho", destination: "Magdalena", fare: FARE,
    hours: "Lun–Dom · desde SJL 5:00–23:00 · desde Magdalena 6:00–24:00",
    source: "https://corredormorado.pe/servicio-404/",
    stops: {
      ida: ["La Capilla","Montenegro","Motupe","8 de Mariscal","Mariátegui","La Cinco","La Cuatro","Bayóvar","La Quince","Santa Rosa","San Martín","La Ocho","Sedapal","San Carlos","Basadre","Los Postes","La Hacienda","Celima","Pirámide del Sol","Túpac Amaru","Lima","Concejo","Mdo. de Flores","Acho","Áncash","Ucayali","Cuzco","N. de Piérola","Grau","Cotabambas","Garcilaso","Pza. Bolognesi","Don Bosco","H. del Niño","La Nueve","La Doce (mercado)","Bolívar","La Dieciocho","Óvalo","Colegio","Hospital PNP","Javier Prado","Venus","La Virgen"],
      vuelta: ["Venus","Javier Prado","Hospital PNP","Colegio","Óvalo","La Dieciocho","Bolívar","La Doce","La Nueve","H. del Niño","Pza. Bolognesi","Chota","Garcilaso","José Gálvez","Montevideo","N. de Piérola","Cuzco","Ucayali","Junín","Acho","Mdo. de Flores","Concejo","Túpac Amaru","Pirámide del Sol","Ascarruz","Celima","La Hacienda","Los Postes","Basadre","San Carlos","Sedapal","La Ocho","San Martín","Santa Rosa","La Quince","Bayóvar","La Cuatro","La Cinco","Mariátegui","8 de Mariscal","Motupe","Montenegro","La Capilla"],
    },
  },
  {
    id: "405", corridor: "morado", origin: "San Juan de Lurigancho", destination: "San Isidro", fare: FARE,
    hours: "Lun–Dom · desde SJL 5:00–23:00 · desde San Isidro 6:00–23:00",
    source: "https://corredormorado.pe/servicio-405/",
    stops: {
      ida: ["La Capilla","Montenegro","Motupe","8 de Mariscal","Mariátegui","La Cinco","La Cuatro","Bayóvar","La Quince","Santa Rosa","San Martín","La Ocho","Sedapal","San Carlos","Basadre","Los Postes","La Hacienda","Celima","Pirámide del Sol","Túpac Amaru","Lima","Concejo","Mdo. de Flores","Acho","Áncash","Ucayali","Cuzco","N. de Piérola","Grau","28 de Julio","Unanue","Católica","México","Pardo de Zela","Tomás Guido","Javier Prado"],
      vuelta: ["Torres Ugarte","Risso","Candamo","Segura","Estación México","México","Católica","Unanue","28 de Julio","Grau","N. de Piérola","Cuzco","Ucayali","Áncash","Acho","Mdo. de Flores","Concejo","Lima","Túpac Amaru","Pirámide del Sol","Celima","La Hacienda","Los Postes","Basadre","San Carlos","Sedapal","La Ocho","San Martín","Santa Rosa","La Quince","Bayóvar","La Cuatro","La Cinco","Mariátegui","8 de Mariscal","Motupe","Montenegro","La Capilla"],
    },
  },
  {
    id: "409", corridor: "morado", origin: "San Juan de Lurigancho", destination: "San Isidro", fare: FARE,
    hours: "Lun–Dom 5:00–23:00",
    source: "https://corredormorado.pe/servicio-409/",
    stops: {
      ida: ["La Capilla","Montenegro","Motupe","8 de Mariscal","Mariátegui","La Cinco","La Cuatro","Lubricantes","Farmacia Leo","Catorce – JCM","Dieciséis – CG","Trece – CG","Doce – CG","Diez – CG","Ocho – CG","Cinco – CG","Dos – CG","Comisaría","Veintiuno – CG","Diecinueve – CG","Dieciocho – CG","Diecisiete – CG","Quince – LF","Doce – LF","Diez – LF","Siete – LF","Cuatro – LF","Dos – LF","Uno – LF","Curva","Concejo","Mdo. de Flores","Acho","Áncash","Ucayali","Cuzco","N. Piérola Grau","28 de Julio","Unanue","Católica","México","Pardo de Zela","Tomás Guido","Javier Prado","Carnaval y Moreyra"],
      vuelta: ["Carnaval y Moreyra","Javier Prado","Soledad","Las Lilas","Pardo de Zela","Est. México","México","Católica","Unanue","Bauzate y Meza","Grau","N. Piérola Grau","Cuzco","Ucayali","Junín","Acho","Mdo. de Flores","Concejo","Lima","Uno – LF","Dos – LF","Cuatro – LF","Siete – LF","Nueve – LF","Doce – LF","Quince – LF","Dieciocho – CG","Diecinueve – CG","Veintiuno – CG","Veintidós – CG","Dos – CG","Cinco – CG","Ocho – CG","Diez – CG","Doce – CG","Dieciséis – CG","Catorce – CG","Farmacia Leo","Lubricantes","La Cuatro","La Cinco","Mariátegui","8 de Mariscal","Motupe","Montenegro","La Capilla"],
    },
  },
  {
    id: "412", corridor: "morado", origin: "San Juan de Lurigancho", destination: "Cercado de Lima", fare: FARE,
    hours: "Lun–Sáb 5:30–22:00",
    source: "https://corredormorado.pe/servicio-412/",
    stops: {
      ida: ["La Capilla","Montenegro","Motupe","8 de Mariscal","Mariátegui","La Cinco","La Cuatro","Bayóvar","La Quince","Santa Rosa","San Martín","La Ocho","Canto Rey","San Carlos","Basadre","Los Postes","La Doce","La Hacienda","Celima","Pirámide del Sol","Túpac Amaru","Las Flores","Comisaría","La Losa","Túnel","Alcázar","Pizarro","Ica"],
      // La web oficial repite el bloque Basadre → Santa Rosa dos veces; aquí va una sola vez.
      vuelta: ["Ica","Pizarro","Alcázar","La 15 de Caja de Agua","Moquegua","Próceres","Túpac Amaru","Pirámide del Sol","Celima","La Hacienda","La Doce","Los Postes","Basadre","San Carlos","Canto Rey","La Ocho","San Martín","Santa Rosa","Motupe","Montenegro","La Capilla"],
    },
  },
];

/** Servicios que paran en un paradero dado (búsqueda simple por nombre). */
export function servicesAtStop(name: string): BusService[] {
  const n = name.toLowerCase();
  return busServices.filter((s) =>
    [...s.stops.ida, ...s.stops.vuelta].some((st) => st.toLowerCase().includes(n)),
  );
}
