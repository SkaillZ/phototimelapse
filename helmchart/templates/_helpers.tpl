{{/*
Default Template for Deployment. All Sub-Charts under this Chart can include the below template.
*/}}
{{- define "parent-chart.deploymenttemplate" }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.subname }}-dpm
  {{ if (eq .Values.annotations.enabled true) }}
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-protocol: "http"
    service.beta.kubernetes.io/do-loadbalancer-size-slug: "lb-large"
  {{ end }}
  labels:
    app: {{ .Values.subname }}
spec:
  selector:
    matchLabels:
      app: {{ .Values.subname }}
  template:
    metadata:
      labels:
        app: {{ .Values.subname }}
    spec:
      containers:
      - image: {{ .Values.container.image }}
        name: {{ .Values.subname }}
        ports:
        {{ if (eq .Values.container.ports.singlePort true) }}
        - containerPort: {{ .Values.container.ports.port }}
        {{- end }}
        {{ if (eq .Values.container.ports.singlePort false) }}
        {{- range .Values.container.ports.multiplePorts}}
          - containerPort: {{ .port}}
            name: {{ .name}}
        {{- end }}
        {{- end }}
        {{ if (eq .Values.pvc.enabled true) }}
        volumeMounts:
        - name: {{ .Values.subname }}-volume
          mountPath: {{ .Values.pvc.mountPath }}
        {{- end }}
        env:
          {{- range .Values.container.env}}
          - name: {{ .name}}
            value: {{ .value}}
          {{- end }}
      {{ if (eq .Values.pvc.enabled true) }}
      volumes:
      - name: {{ .Values.subname }}-volume
        persistentVolumeClaim:
          claimName: {{ .Values.subname }}-pvc
      {{- end }}
{{- end }}


{{/*
Default Template for Service. All Sub-Charts under this Chart can include the below template.
*/}}
{{- define "parent-chart.servicetemplate" }}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.subname }}-svc
  labels:
    app: {{ .Values.subname }}
spec:
  ports:
    {{ if (eq .Values.container.ports.singlePort true) }}
    - port: {{ .Values.container.ports.port }}
      targetPort: {{ .Values.container.ports.targetPort }}
    {{- end }}
    {{ if (eq .Values.container.ports.singlePort false) }}
    {{- range .Values.container.ports.multiplePorts}}
          - port: {{ .port}}
            name: {{ .name}}
    {{- end }}
    {{- end }}
  selector:
    app: {{ .Values.subname }}
  type: {{ .Values.service.type }}
{{- end }}
