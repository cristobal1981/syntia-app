/**
 * Marca (en `ir.attachment.description`) de los documentos que sube el cliente
 * desde Syntia: se suben con el mismo usuario de Odoo que usa el equipo, así que
 * el creador no los distingue. La regla de Odoo que avisa de documentos nuevos
 * (scripts/odoo-actions/syntia-evento-documento.py) los salta con esta marca.
 */
export const SYNTIA_CLIENT_ATTACHMENT_MARK = 'syntia:cliente'
