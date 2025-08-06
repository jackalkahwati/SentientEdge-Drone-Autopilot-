{{/*
Expand the name of the chart.
*/}}
{{- define "sentient-edge.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "sentient-edge.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "sentient-edge.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sentient-edge.labels" -}}
helm.sh/chart: {{ include "sentient-edge.chart" . }}
{{ include "sentient-edge.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: drone-control-platform
environment: {{ .Values.environment }}
classification: military-grade
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sentient-edge.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sentient-edge.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "sentient-edge.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sentient-edge.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "sentient-edge.frontend.selectorLabels" -}}
{{ include "sentient-edge.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "sentient-edge.backend.selectorLabels" -}}
{{ include "sentient-edge.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "sentient-edge.postgresql.selectorLabels" -}}
{{ include "sentient-edge.selectorLabels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{/*
Redis selector labels
*/}}
{{- define "sentient-edge.redis.selectorLabels" -}}
{{ include "sentient-edge.selectorLabels" . }}
app.kubernetes.io/component: redis
{{- end }}

{{/*
NGINX selector labels
*/}}
{{- define "sentient-edge.nginx.selectorLabels" -}}
{{ include "sentient-edge.selectorLabels" . }}
app.kubernetes.io/component: nginx
{{- end }}

{{/*
Create image pull secrets
*/}}
{{- define "sentient-edge.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- else if .Values.image.pullSecrets }}
imagePullSecrets:
{{- range .Values.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Security context for pods
*/}}
{{- define "sentient-edge.securityContext" -}}
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
  seccompProfile:
    type: RuntimeDefault
{{- end }}

{{/*
Container security context
*/}}
{{- define "sentient-edge.containerSecurityContext" -}}
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
{{- end }}

{{/*
Common environment variables
*/}}
{{- define "sentient-edge.commonEnv" -}}
- name: NODE_ENV
  value: {{ .Values.config.nodeEnv | quote }}
- name: LOG_LEVEL
  value: {{ .Values.config.logLevel | quote }}
- name: ENVIRONMENT
  value: {{ .Values.environment | quote }}
{{- end }}

{{/*
Database connection string
*/}}
{{- define "sentient-edge.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
postgresql://{{ .Values.postgresql.auth.username }}:{{ .Values.postgresql.auth.password }}@{{ include "sentient-edge.fullname" . }}-postgresql:5432/{{ .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.externalDatabase.url }}
{{- end }}
{{- end }}

{{/*
Redis connection string
*/}}
{{- define "sentient-edge.redisUrl" -}}
{{- if .Values.redis.enabled }}
redis://{{ include "sentient-edge.fullname" . }}-redis-master:6379
{{- else }}
{{- .Values.externalRedis.url }}
{{- end }}
{{- end }}