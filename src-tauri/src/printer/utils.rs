pub fn sanitize_text(text: &str) -> String {
    let ascii = deunicode::deunicode(text);
    ascii
        .chars()
        .filter(|c| c.is_ascii() && (!c.is_ascii_control() || *c == '\n'))
        .collect()
}

pub fn mm_to_dots(mm: f64, dpi: u16) -> u32 {
    let mm_to_inches = 1.0 / 25.4;
    ((mm * mm_to_inches) * dpi as f64).round() as u32
}

pub fn chars_per_line(paper_width_dots: u32) -> usize {
    (paper_width_dots / 12).clamp(24, 48) as usize
}
