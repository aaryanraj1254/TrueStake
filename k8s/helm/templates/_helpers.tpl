{{- define "truestake-api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "truestake-api.labels" -}}
app.kubernetes.io/name: {{ include "truestake-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "truestake-api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "truestake-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
