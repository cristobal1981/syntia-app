export const onboarding = {
  altaAutonomo: {
    formKind: 'alta_autonomo',
    path: '/solicitud-alta-autonomo',
    odoo: {
      model: 'x_solicitud_alta_autonomo',
      /** Nombres reales confirmados con fields_get en Odoo 19. */
      fields: {
        recipientEmail: 'x_email',
        fullName: 'x_nombre_completo',
        firstName: 'x_nombre',
        lastName: 'x_apellidos',
        nifNie: 'x_nif_nie',
        phone: 'x_numero_tlf',
        hasDigitalCertificate: 'x_tieneCertificadoDigital',
        isAlreadyAutonomo: 'x_esAutonomo',
        startedAutonomoAt: 'x_fecha_alta_autonomo_activo',
        wantsStartWithUsAt: 'x_fecha_alta_nosotros',
        requestedAltaAt: 'x_fecha_alta_nuevo_autonomo',
        wasAutonomoLast3Years: 'x_esAutonomo3Anios',
        previousAutonomoEndDate: 'x_fecha_baja_autonomo',
        activityAddress: 'x_direccion_actividad',
        city: 'x_ciudad',
        province: 'x_provincia',
        postalCode: 'x_codigo_postal',
        country: 'x_pais',
        activityDescription: 'x_actividad_laboral',
        annualIncomeEstimateEur: 'x_est_ingresos_anuales',
        iban: 'x_iban',
        comments: 'x_comentarios',
      },
    },
  },
} as const

export type AltaAutonomoFormKind = typeof onboarding.altaAutonomo.formKind
