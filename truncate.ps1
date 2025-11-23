$lines = Get-Content "src/components/CapacityOverview.tsx"
$lines[0..1207] | Set-Content "src/components/CapacityOverview.tsx" -Force
